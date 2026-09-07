import { DEFAULT_MODELS_CATALOG } from "@/config/constants";
import { executeAntigravityRequest } from "@/adapters/antigravity";
import { executeCloudflareAI } from "@/adapters/cloudflare-ai";
import { executeOneMinAI } from "@/adapters/onemin";
import { executeOpenAICompatible } from "@/adapters/openai-compatible";
import { getValidAntigravityAccessToken } from "@/oauth/antigravity";
import { markKeyRateLimited, selectActiveKey } from "./keyPool";
import { getAdminConfig } from "@/admin/store";
import { registerCustomProvider } from "@/config/providers";
import { evaluateQuotaShare, recordQuotaShareUsage } from "./quotaShare";
import { applyRoutingStrategy, recordCandidateSuccess, type TargetCandidate } from "./strategies";
import type { ChatCompletionRequest } from "@/types/openai";
import type { EnvBindings } from "@/types/provider";
import type { AdminConfig } from "@/admin/store";

/** Resolve the list of routing candidates from the requested model name or combo ID. */
export function resolveCandidates(
  request: ChatCompletionRequest,
  adminCfg?: AdminConfig
): { candidates: TargetCandidate[]; comboStrategy?: string } {
  const model = request.model;

  // 1. Dynamic combo from admin config (KV-persisted)
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

  // 2. Provider-prefixed model (explicit routing)
  for (const prefix of ["antigravity", "1min", "cloudflare-ai", "cerebras", "groq", "gemini", "azure", "bedrock"]) {
    if (model.startsWith(prefix + "/") || (prefix === "cloudflare-ai" && model.startsWith("@cf/"))) {
      return { candidates: [{ provider: prefix === "cloudflare-ai" ? "cloudflare-ai" : prefix, model }] };
    }
  }

  // 3. Catalog lookup
  const matched = DEFAULT_MODELS_CATALOG.find((m) => m.id === model);
  if (matched?.provider) {
    const primary: TargetCandidate = { provider: matched.provider, model: matched.id, cost: matched.pricing?.input_per_million || 0 };
    const fallbacks: TargetCandidate[] = [];
    if (primary.provider !== "groq") fallbacks.push({ provider: "groq", model: "llama-3.3-70b-versatile", cost: 0 });
    if (primary.provider !== "gemini") fallbacks.push({ provider: "gemini", model: "gemini-2.5-flash", cost: 0 });
    fallbacks.push({ provider: "cloudflare-ai", model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", cost: 0 });
    return { candidates: [primary, ...fallbacks] };
  }

  // 4. Default cascade
  return {
    candidates: [
      { provider: "groq", model: "llama-3.3-70b-versatile", cost: 0 },
      { provider: "gemini", model: "gemini-2.5-flash", cost: 0 },
      { provider: "cloudflare-ai", model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", cost: 0 },
      { provider: "pollinations", model: "openai", cost: 0 },
    ],
  };
}

/** Filter and reorder candidates according to admin routing rules. */
async function applyAdminRouting(
  ordered: TargetCandidate[],
  request: ChatCompletionRequest,
  env: EnvBindings
): Promise<TargetCandidate[]> {
  const cfg = await getAdminConfig(env);
  const customIds = new Set(Object.keys(cfg.customProviders));
  let candidates = [...ordered];

  // Inject custom provider at the front if addressed by prefix
  const model = request.model || "";
  const slashIdx = model.indexOf("/");
  const colonIdx = model.indexOf(":");
  const prefix = slashIdx > 0 ? model.slice(0, slashIdx) : colonIdx > 0 ? model.slice(0, colonIdx) : "";
  if (prefix && customIds.has(prefix) && !candidates.some((c) => c.provider === prefix)) {
    candidates.unshift({ provider: prefix, model, cost: 0 });
  }

  // Filter disabled providers
  candidates = candidates.filter((cand) => {
    if (customIds.has(cand.provider)) return true;
    return cfg.providerStates[cand.provider]?.enabled !== false;
  });

  // Filter individually disabled models
  candidates = candidates.filter((cand) => cfg.modelStates[cand.provider + "/" + cand.model]?.enabled !== false);

  return candidates;
}

/**
 * Dispatch with cascade fallback.
 *
 * C-3: quota is evaluated against the authenticated API key ID passed in via
 * request.apiKeyId (set by the auth middleware in index.ts via c.set), NOT
 * against the client-supplied request.user field.
 */
export async function dispatchWithCascade(
  request: ChatCompletionRequest,
  env: EnvBindings,
  /** Authenticated principal ID — set by the auth middleware, never from client body */
  authenticatedKeyId?: string
): Promise<Response> {
  const adminCfg = await getAdminConfig(env);

  // Register custom providers from admin config
  for (const [pid, cp] of Object.entries(adminCfg.customProviders)) {
    registerCustomProvider(pid, {
      name: cp.name, baseUrl: cp.baseUrl, authType: "bearer",
      models: cp.models, freeTier: cp.freeTier,
      supportsStreaming: cp.supportsStreaming,
      supportsTools: cp.supportsTools, supportsVision: cp.supportsVision,
    });
  }

  const { candidates: initial, comboStrategy } = resolveCandidates(request, adminCfg);
  const strategy = request.routing_strategy || comboStrategy || env.DEFAULT_ROUTING_STRATEGY || "priority";
  const orderedCandidates = await applyAdminRouting(
    applyRoutingStrategy(initial, strategy, undefined), // session affinity uses authenticatedKeyId, not user field
    request,
    env
  );

  // C-3 + M-9: Quota check only when flag is on AND we have an authenticated key ID
  if (env.ENABLE_QUOTA_SHARING === "true" && authenticatedKeyId) {
    const quotaDecision = evaluateQuotaShare(authenticatedKeyId, env);
    if (!quotaDecision.allowed) {
      return new Response(
        JSON.stringify({
          error: {
            message: "Limite de cota compartilhada excedido. Aguarde a liberação da janela de uso.",
            type: "quota_share_exceeded",
            resetAt: new Date(quotaDecision.resetAt).toISOString(),
          },
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  const errors: Array<{ provider: string; model: string; status: number; message: string }> = [];

  for (const candidate of orderedCandidates) {
    try {
      let response: Response;

      if (candidate.provider === "antigravity") {
        const { accessToken, projectId } = await getValidAntigravityAccessToken(env);
        response = await executeAntigravityRequest(request, accessToken, projectId, candidate.model);
      } else if (candidate.provider === "1min") {
        const key = await selectActiveKey(env, "1min");
        response = await executeOneMinAI(request, key, candidate.model);
      } else if (candidate.provider === "cloudflare-ai") {
        response = await executeCloudflareAI(request, env.AI, candidate.model);
      } else {
        const apiKey = await selectActiveKey(env, candidate.provider);
        if (!apiKey && candidate.provider !== "pollinations") {
          errors.push({ provider: candidate.provider, model: candidate.model, status: 401, message: `Sem chave de API configurada para ${candidate.provider}` });
          continue;
        }
        response = await executeOpenAICompatible(request, candidate.provider, apiKey, candidate.model);
        if (response.status === 429) markKeyRateLimited(env, apiKey, 60);
      }

      if (response.ok) {
        recordCandidateSuccess(candidate, authenticatedKeyId);
        // M-9 + C-3: record usage only under flag and only for authenticated keys
        if (env.ENABLE_QUOTA_SHARING === "true" && authenticatedKeyId) {
          recordQuotaShareUsage(authenticatedKeyId, 1);
        }
        return response;
      }

      if (response.status === 429 || response.status === 401 || response.status === 403 || (response.status >= 500 && response.status <= 504)) {
        const errBody = await response.clone().text().catch(() => "");
        errors.push({ provider: candidate.provider, model: candidate.model, status: response.status, message: errBody.slice(0, 200) });
        console.warn(`[VeroRoute] ${candidate.provider} (${candidate.model}) -> ${response.status}: fallback`);
        continue;
      }

      return response;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ provider: candidate.provider, model: candidate.model, status: 500, message: msg });
      console.warn(`[VeroRoute] Exception in ${candidate.provider} (${candidate.model}): ${msg}`);
    }
  }

  return new Response(
    JSON.stringify({
      error: {
        message: "Todos os provedores da cascata falharam.",
        type: "veroroute_cascade_failure",
        attempts: errors,
      },
    }),
    { status: 502, headers: { "Content-Type": "application/json" } }
  );
}
