import { DEFAULT_MODELS_CATALOG } from "@/config/constants";
import { executeAntigravityRequest } from "@/adapters/antigravity";
import { executeCloudflareAI } from "@/adapters/cloudflare-ai";
import { executeOneMinAI } from "@/adapters/onemin";
import { executeOpenAICompatible } from "@/adapters/openai-compatible";
import { getValidAntigravityAccessToken } from "@/oauth/antigravity";
import { markKeyRateLimited, selectActiveCredential } from "./keyPool";
import { getAdminConfig } from "@/admin/store";
import { getProviderConfig, registerCustomProvider } from "@/config/providers";
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
// Candidate resolution
// ---------------------------------------------------------------------------
export function resolveCandidates(
  request: ChatCompletionRequest,
  adminCfg?: AdminConfig
): { candidates: TargetCandidate[]; comboStrategy?: string } {
  const model = request.model;

  if (adminCfg?.combos?.[model]?.enabled) {
    const combo = adminCfg.combos[model];
    return {
      candidates: combo.targets.map((t) => ({
        provider: t.provider,
        model: t.model,
        weight: t.weight,
        priority: t.priority,
        cost: 0,
      })),
      comboStrategy: combo.strategy,
    };
  }

  for (const prefix of ["antigravity", "1min", "cloudflare-ai", "cerebras", "groq", "gemini", "azure", "bedrock"]) {
    if (model.startsWith(prefix + "/") || (prefix === "cloudflare-ai" && model.startsWith("@cf/"))) {
      return {
        candidates: [{ provider: prefix, model, weight: 1, priority: 1, cost: 0 }],
      };
    }
  }

  const entry = DEFAULT_MODELS_CATALOG.find((m) => m.id === model);
  if (entry) {
    return {
      candidates: [{
        provider: entry.provider,
        model: entry.id,
        weight: 1,
        priority: 1,
        cost: entry.pricing?.input_per_million ?? 0,
      }],
    };
  }

  const fallback = DEFAULT_MODELS_CATALOG[0];
  return {
    candidates: fallback ? [{
      provider: fallback.provider,
      model: fallback.id,
      weight: 1,
      priority: 1,
      cost: fallback.pricing?.input_per_million ?? 0,
    }] : [],
  };
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
            if (candidate.provider === "1min") {
              return executeOneMinAI(outbound, apiKey, candidate.model, credential.proxyUrl);
            }
            return executeOpenAICompatible(outbound, candidate.provider, apiKey, candidate.model, credential.proxyUrl);
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
