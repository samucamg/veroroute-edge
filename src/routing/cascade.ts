import { enrichModelMetadata, getStaticCatalog } from "@/config/modelRegistry";
import { executeAntigravityRequest } from "@/adapters/antigravity";
import { executeCloudflareAI } from "@/adapters/cloudflare-ai";
// Adapter 1min.ai removido: usar provedor customizado genérico compatível com OpenAI via painel admin.
import { executeOpenAICompatible } from "@/adapters/openai-compatible";
import { getValidAntigravityAccessToken } from "@/oauth/antigravity";
import { markKeyRateLimited, selectActiveCredential } from "./keyPool";
import { getAdminConfig } from "@/admin/store";
import { getProviderConfig, registerCustomProvider, PROVIDER_REGISTRY } from "@/config/providers";
import { normalizeProviderId } from "@/config/providerAliases";
import { applyRoutingStrategy, recordCandidateSuccess, type TargetCandidate } from "./strategies";
import { injectToolCallingPrompt, postProcessEmulatedResponse, completionToSSE } from "@/adapters/toolEmulation";
import { withDeadline, UpstreamTimeout, boundedInt } from "./resilience";
import { enforceRateLimit } from "./rateLimiter";
import { getCachedResponse, cacheResponse } from "./responseCache";
import { recordUsage, checkBudget } from "./costTracker";
import { isProviderAvailable, recordProviderFailure, recordProviderSuccess } from "./circuitBreaker";
import type { ChatCompletionRequest } from "@/types/openai";
import type { EnvBindings } from "@/types/provider";
import type { AdminConfig } from "@/admin/store";
import type { AuthPrincipal } from "@/admin/auth";

// ---------------------------------------------------------------------------
// Candidate resolution — respeita providerStates, modelStates e removedModels
// ---------------------------------------------------------------------------
function isCandidateAllowed(provider: string, modelName: string, adminCfg?: AdminConfig): boolean {
  if (!adminCfg) return true;
  if (adminCfg.providerStates?.[provider]?.enabled === false) return false;
  if (adminCfg.modelStates?.[`${provider}/${modelName}`]?.enabled === false) return false;
  if (adminCfg.modelStates?.[modelName]?.enabled === false) return false;
  if (adminCfg.removedModels?.[provider]?.includes(modelName)) return false;
  return true;
}

export function resolveCandidates(
  request: ChatCompletionRequest,
  adminCfg?: AdminConfig
): { candidates: TargetCandidate[]; comboStrategy?: string } {
  const model = (request.model || "").trim();
  if (!model) return { candidates: [] };

  // 1. Combos inteligentes
  if (adminCfg?.combos?.[model]?.enabled) {
    const combo = adminCfg.combos[model];
    const validTargets = combo.targets
      .filter((t) => isCandidateAllowed(t.provider, t.model, adminCfg))
      .map((t) => {
        const enriched = enrichModelMetadata(t.provider, t.model);
        return {
          provider: t.provider,
          model: t.model,
          weight: t.weight,
          priority: t.priority,
          cost: enriched.pricing?.input_per_million ?? 0,
        };
      });

    return {
      candidates: validTargets,
      comboStrategy: combo.strategy,
    };
  }

  // 2. Prefixo explícito de Cloudflare Workers AI (@cf/...)
  if (model.startsWith("@cf/")) {
    const provider = "cloudflare-ai";
    if (isCandidateAllowed(provider, model, adminCfg)) {
      const enriched = enrichModelMetadata(provider, model);
      return {
        candidates: [{
          provider,
          model,
          weight: 1,
          priority: 1,
          cost: enriched.pricing?.input_per_million ?? 0,
        }],
      };
    }
    return { candidates: [] };
  }

  // 3. Prefixo derivado dinamicamente de todos os provedores conhecidos (PROVIDER_REGISTRY + customProviders)
  //
  // ⚠️  IMPORTANTE — Distinção entre gateway prefix e namespace de modelo:
  //   "groq/llama-3.3-70b-versatile" → prefix "groq" é o PROVEDOR (gateway prefix explícito)
  //   "openai/gpt-oss-120b"          → prefix "openai" é o NAMESPACE do modelo, servido pela Groq
  //
  // Para distinguir os dois casos, verificamos se o sub-modelo realmente existe no catálogo do
  // provedor identificado pelo prefixo. Se não existir, caímos para o Step 4, que varre todos
  // os catálogos pelo model string completo e encontra o provedor correto.
  if (model.includes("/")) {
    const slashIdx = model.indexOf("/");
    const rawPrefix = model.slice(0, slashIdx);
    const providerId = normalizeProviderId(rawPrefix);

    const isKnownProvider =
      Boolean(PROVIDER_REGISTRY[providerId]) ||
      Boolean(adminCfg?.customProviders?.[providerId]) ||
      Boolean(getProviderConfig(providerId));

    if (isKnownProvider) {
      const subModel = model.slice(slashIdx + 1);

      // Construir catálogo completo do provedor (registry + static + customModels + customProvider)
      const provAllModels = [
        ...(PROVIDER_REGISTRY[providerId]?.models || []),
        ...(getStaticCatalog(providerId) || []),
        ...(adminCfg?.customModels?.[providerId] || []),
        ...(adminCfg?.customProviders?.[providerId]?.models || []),
      ];

      // Provedores customizados gen\u00e9ricos: aceitar qualquer sub-modelo explicitamente prefixado,
      // pois o endpoint OpenAI-compat vai processar o modelo diretamente. N\u00e3o exigimos cat\u00e1logo local.
      const isCustomGenericProvider = Boolean(adminCfg?.customProviders?.[providerId]) && !PROVIDER_REGISTRY[providerId];

      // Aceita tanto "groq/llama-3.3-70b" \u2192 sub "llama-3.3-70b" quanto modelos no cat\u00e1logo completo
      const subModelInCatalog = isCustomGenericProvider || provAllModels.includes(subModel) || provAllModels.includes(model);

      if (subModelInCatalog) {
        // Gateway prefix expl\u00edcito: o sub-modelo pertence ao cat\u00e1logo deste provedor.
        if (isCandidateAllowed(providerId, model, adminCfg) && isCandidateAllowed(providerId, subModel, adminCfg)) {
          const normalizedModel = providerId === rawPrefix ? model : `${providerId}/${subModel}`;
          const enriched = enrichModelMetadata(providerId, subModel);
          return {
            candidates: [{
              provider: providerId,
              model: normalizedModel,
              weight: 1,
              priority: 1,
              cost: enriched.pricing?.input_per_million ?? 0,
            }],
          };
        }
        return { candidates: [] };
      }
      // Sub-modelo N\u00c3O encontrado no cat\u00e1logo do prefixo \u2192 cai para Step 4 (varredura completa)
    }
  }


  // 4. Modelo sem prefixo: busca em provedores embutidos ativos
  for (const [pId, prov] of Object.entries(PROVIDER_REGISTRY)) {
    if (!isCandidateAllowed(pId, model, adminCfg)) continue;

    const baseModels = prov.models?.length > 0 ? prov.models : getStaticCatalog(pId);
    const customModels = adminCfg?.customModels?.[pId] || [];
    if (baseModels.includes(model) || customModels.includes(model)) {
      const enriched = enrichModelMetadata(pId, model);
      return {
        candidates: [{
          provider: pId,
          model,
          weight: 1,
          priority: 1,
          cost: enriched.pricing?.input_per_million ?? 0,
        }],
      };
    }
  }

  // 5. Modelo sem prefixo em custom providers ativos
  if (adminCfg?.customProviders) {
    for (const [cpId, cp] of Object.entries(adminCfg.customProviders)) {
      if (!isCandidateAllowed(cpId, model, adminCfg)) continue;
      const allModels = [...(cp.models || []), ...(adminCfg.customModels?.[cpId] || [])];
      if (allModels.includes(model)) {
        return {
          candidates: [{
            provider: cpId,
            model,
            weight: 1,
            priority: 1,
            cost: cp.costPerMillionInput ?? 0,
          }],
        };
      }
    }
  }

  // 6. Sem fallback silencioso para gpt-4o: retorna lista vazia para resultar em 400 Bad Request
  return { candidates: [] };
}

// ---------------------------------------------------------------------------
// Sanitise upstream errors â never leak internal details
// ---------------------------------------------------------------------------
function sanitiseError(raw: string, provider: string, status: number): string {
  if (status === 429) return `Provider ${provider} rate-limited (429)`;
  if (status === 401 || status === 403) return `Provider ${provider} auth error (${status})`;
  if (status >= 500) return `Provider ${provider} server error (${status})`;
  const safe = raw.replace(/[A-Za-z0-9_-]{20,}/g, "***").slice(0, 120);
  return `Provider ${provider} error (${status}): ${safe}`;
}

// ---------------------------------------------------------------------------
// Extract token usage from response body (best-effort)
// ---------------------------------------------------------------------------
function extractTokenUsage(body: any): { prompt: number; completion: number } {
  const usage = body?.usage || {};
  return {
    prompt: usage.prompt_tokens || usage.input_tokens || 0,
    completion: usage.completion_tokens || usage.output_tokens || 0,
  };
}

// ---------------------------------------------------------------------------
// Dispatch with cascade + Phase C features (rate limit, cache, cost, circuit)
// ---------------------------------------------------------------------------
export async function dispatchWithCascade(
  request: ChatCompletionRequest,
  env: EnvBindings,
  ctx?: ExecutionContext,
  principal?: AuthPrincipal,
): Promise<Response> {
  const adminCfg = await getAdminConfig(env);

  if (adminCfg.customProviders) {
    for (const cp of Object.values(adminCfg.customProviders)) {
      registerCustomProvider(cp.id, cp as any);
    }
  }

  // C1: Rate limit enforcement (per-key RPM + global quota)
  if (principal) {
    const rlBlocked = await enforceRateLimit(env, principal, ctx);
    if (rlBlocked) return rlBlocked;

    // C4: Budget check (if configured on virtual key)
    const budget = principal.kind === "virtual"
      ? { dailyLimitUsd: (adminCfg.virtualKeys?.[principal.id] as any)?.dailyBudgetUsd,
          monthlyLimitUsd: (adminCfg.virtualKeys?.[principal.id] as any)?.monthlyBudgetUsd }
      : undefined;
    if (budget) {
      const budgetBlocked = await checkBudget(env, principal, budget);
      if (budgetBlocked) return budgetBlocked;
    }
  }

  // C2: Cache lookup
  const cached = await getCachedResponse(request);
  if (cached) return cached;

  const { candidates, comboStrategy } = resolveCandidates(request, adminCfg);
  if (candidates.length === 0) {
    return Response.json(
      {
        error: {
          message: `Model '${request.model}' is unknown or not available. Please specify a valid model or provider prefix (e.g. 'groq/llama-3.3-70b-versatile').`,
          type: "invalid_request_error",
          code: "model_not_found",
        },
      },
      { status: 400 }
    );
  }
  const strategyName = comboStrategy || env.DEFAULT_ROUTING_STRATEGY || "priority";
  const ordered = applyRoutingStrategy(candidates, strategyName, request.model);

  const maxRetries = boundedInt(env.MAX_RETRIES, 3, 1, 10);
  const retryDelay = boundedInt(env.RETRY_DELAY_MS, 1000, 100, 10000);
  const candidateTimeout = boundedInt((env as any).CASCADE_TIMEOUT_MS, 45000, 5000, 120000);

  const hasTools = !!request.tools?.length;
  const wantedStream = request.stream ?? false;
  const attempts: Array<{ provider: string; model: string; status: number; message: string }> = [];

  for (const candidate of ordered) {
    // C5: Circuit breaker check â skip if provider is open
    const available = await isProviderAvailable(env, candidate.provider);
    if (!available) {
      attempts.push({ provider: candidate.provider, model: candidate.model, status: 0, message: "Circuit open" });
      continue;
    }

    const provCfg = getProviderConfig(candidate.provider);
    const needsToolEmulation = hasTools && provCfg?.supportsTools === false;

    let outbound = request;
    if (needsToolEmulation) {
      outbound = injectToolCallingPrompt(request);
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const credential = await selectActiveCredential(env, candidate.provider);
        const apiKey = credential.apiKey;
        // Ordem de precedência para baseUrl:
        // 1. Override manual via providerBaseUrls (admin UI)
        // 2. baseUrl declarada no próprio customProvider (campo obrigatório ao cadastrar)
        // 3. Fallback especial para Azure via env var
        const customBaseUrl =
          adminCfg.providerBaseUrls?.[candidate.provider] ||
          adminCfg.customProviders?.[candidate.provider]?.baseUrl ||
          (candidate.provider === "azure" ? env.AZURE_OPENAI_ENDPOINT : undefined);

        let response: Response;
        try {
          response = await withDeadline(async (signal) => {
            if (candidate.provider === "cloudflare-ai") {
              return executeCloudflareAI(outbound, env.AI, candidate.model);
            }
            if (candidate.provider === "antigravity") {
              const antigravResult = await getValidAntigravityAccessToken(env);
              if (!antigravResult?.accessToken) throw new Error("Antigravity: no valid access token");
              return executeAntigravityRequest(outbound, antigravResult.accessToken, antigravResult.projectId || "", candidate.model);
            }
            // Para provedores customizados genéricos, ler o protocolo declarado no admin
            // ("anthropic" ou "openai") e passar para o adapter de forma que ele use
            // o header correto (x-api-key + anthropic-version vs Authorization: Bearer)
            const customProtocol = adminCfg.customProviders?.[candidate.provider]?.protocol;
            return executeOpenAICompatible(outbound, candidate.provider, apiKey, candidate.model, customBaseUrl, customProtocol);
          }, candidateTimeout);
        } catch (err) {
          if (err instanceof UpstreamTimeout) {
            attempts.push({ provider: candidate.provider, model: candidate.model, status: 504, message: "Timeout" });
            await recordProviderFailure(env, candidate.provider, ctx);
            break;
          }
          throw err;
        }

        if (response.ok) {
          // C5: reset circuit
          await recordProviderSuccess(env, candidate.provider, ctx);
          recordCandidateSuccess(candidate);

          // Handle tool emulation
          if (needsToolEmulation) {
            try {
              const json = await response.json();
              const processed = postProcessEmulatedResponse(json, request);

              // C3: Record usage
              if (principal && ctx) {
                const usage = extractTokenUsage(processed);
                ctx.waitUntil(recordUsage(env, principal, candidate.provider, usage.prompt, usage.completion));
              }

              if (wantedStream) return completionToSSE(processed);
              const respBody = new Response(JSON.stringify(processed), {
                headers: { "Content-Type": "application/json" }
              });
              // C2: cache the response
              if (ctx) ctx.waitUntil(cacheResponse(request, respBody.clone(), env));
              return respBody;
            } catch {
              return Response.json({ error: { message: "Upstream returned invalid response", type: "upstream_error" } }, { status: 502 });
            }
          }

          // Non-emulated path: still record usage and cache (best-effort)
          if (principal && ctx) {
            const cloned = response.clone();
            ctx.waitUntil((async () => {
              try {
                const body = await cloned.json();
                const usage = extractTokenUsage(body);
                await recordUsage(env, principal!, candidate.provider, usage.prompt, usage.completion);
              } catch { /* stream or invalid â skip */ }
            })());
          }
          if (ctx && !wantedStream) ctx.waitUntil(cacheResponse(request, response.clone(), env));

          return response;
        }

        // Error handling
        const errBody = await response.text().catch(() => "");
        const sanitised = sanitiseError(errBody, candidate.provider, response.status);
        attempts.push({ provider: candidate.provider, model: candidate.model, status: response.status, message: sanitised });

        // C5: record failure for circuit breaker
        await recordProviderFailure(env, candidate.provider, ctx);

        // Cooldown on 429
        if (response.status === 429 && apiKey) {
          const cooldownPromise = markKeyRateLimited(env, apiKey, 60);
          if (ctx) ctx.waitUntil(cooldownPromise);
          else await cooldownPromise;
        }

        // Retry with exponential backoff
        if ((response.status === 429 || response.status >= 500) && attempt < maxRetries - 1) {
          const delay = retryDelay * Math.pow(2, attempt) + Math.random() * 500;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        break;

      } catch (err: any) {
        const msg = (err?.message || "Unknown error").slice(0, 100);
        attempts.push({ provider: candidate.provider, model: candidate.model, status: 0, message: msg });
        await recordProviderFailure(env, candidate.provider, ctx);
        if (attempt < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, retryDelay * Math.pow(2, attempt)));
          continue;
        }
        break;
      }
    }
  }

  console.warn("Cascade exhausted:", JSON.stringify(attempts));
  return Response.json(
    {
      error: {
        message: "All providers failed. Please try again later.",
        type: "cascade_exhausted",
        attempts: attempts.map((a) => ({ provider: a.provider, model: a.model, status: a.status })),
      },
    },
    { status: 502 }
  );
}
