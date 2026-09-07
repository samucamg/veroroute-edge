import { DEFAULT_MODELS_CATALOG } from "@/config/constants";
import { executeAntigravityRequest } from "@/adapters/antigravity";
import { executeCloudflareAI } from "@/adapters/cloudflare-ai";
import { executeOneMinAI } from "@/adapters/onemin";
import { executeOpenAICompatible } from "@/adapters/openai-compatible";
import { getValidAntigravityAccessToken } from "@/oauth/antigravity";
import { markKeyRateLimited, selectActiveKey } from "./keyPool";
import { getAdminConfig } from "@/admin/store";
import { getProviderConfig, registerCustomProvider } from "@/config/providers";
import { evaluateQuotaShare, recordQuotaShareUsage } from "./quotaShare";
import { applyRoutingStrategy, recordCandidateSuccess, type TargetCandidate } from "./strategies";
import { injectToolCallingPrompt, postProcessEmulatedResponse, completionToSSE } from "@/adapters/toolEmulation";
import { withDeadline, UpstreamTimeout, boundedInt, publicUpstreamError } from "./resilience";
import type { ChatCompletionRequest } from "@/types/openai";
import type { EnvBindings } from "@/types/provider";
import type { AdminConfig } from "@/admin/store";

// ---------------------------------------------------------------------------
// Candidate resolution (unchanged)
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

  // Direct model match in catalog
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

  // Fallback: first model in catalog
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
// Sanitise upstream errors — never leak internal details to client
// ---------------------------------------------------------------------------
function sanitiseError(raw: string, provider: string, status: number): string {
  // For rate-limit and auth errors from upstream, return generic message
  // Never forward raw body which may contain org IDs, key fragments, project names
  if (status === 429) return `Provider ${provider} rate-limited (429)`;
  if (status === 401 || status === 403) return `Provider ${provider} auth error (${status})`;
  if (status >= 500) return `Provider ${provider} server error (${status})`;
  // 4xx client errors — keep only the first 120 safe chars, no key-like substrings
  const safe = raw.replace(/[A-Za-z0-9_-]{20,}/g, "***").slice(0, 120);
  return `Provider ${provider} error (${status}): ${safe}`;
}

// ---------------------------------------------------------------------------
// Dispatch with cascade, retry, timeout, tool emulation
// ---------------------------------------------------------------------------
export async function dispatchWithCascade(
  request: ChatCompletionRequest,
  env: EnvBindings,
  ctx?: ExecutionContext,
): Promise<Response> {
  const adminCfg = await getAdminConfig(env);

  // Register custom providers from admin config
  if (adminCfg.customProviders) {
    for (const cp of Object.values(adminCfg.customProviders)) {
      registerCustomProvider(cp.id, cp as any);
    }
  }

  const { candidates, comboStrategy } = resolveCandidates(request, adminCfg);
  const strategyName = comboStrategy || env.DEFAULT_ROUTING_STRATEGY || "priority";
  const ordered = applyRoutingStrategy(candidates, strategyName, request.model);

  const maxRetries = boundedInt(env.MAX_RETRIES, 3, 1, 10);
  const retryDelay = boundedInt(env.RETRY_DELAY_MS, 1000, 100, 10000);
  const candidateTimeout = boundedInt((env as any).CASCADE_TIMEOUT_MS, 45000, 5000, 120000);

  // Detect if tool emulation is needed
  const hasTools = !!request.tools?.length;
  const wantedStream = request.stream ?? false;

  const authenticatedKeyId = (request as any).__authenticatedKeyId as string | undefined;
  const attempts: Array<{ provider: string; model: string; status: number; message: string }> = [];

  for (const candidate of ordered) {
    const provCfg = getProviderConfig(candidate.provider);
    const needsToolEmulation = hasTools && provCfg?.supportsTools === false;

    // Prepare request: if emulation needed, inject tool prompt and force non-streaming
    let outbound = request;
    if (needsToolEmulation) {
      outbound = injectToolCallingPrompt(request);
      // injectToolCallingPrompt already sets stream:false and strips tools
    }

    // Quota check
    if (env.ENABLE_QUOTA_SHARING === "true" && authenticatedKeyId) {
      const quota = evaluateQuotaShare(authenticatedKeyId, env);
        const allowed = quota.allowed;
      if (!allowed) {
        return Response.json(
          { error: { message: "Quota exceeded for this key window", type: "rate_limit" } },
          { status: 429, headers: { "Retry-After": "60" } }
        );
      }
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const apiKey = await selectActiveKey(env, candidate.provider);

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
              return executeOneMinAI(outbound, apiKey, candidate.model);
            }
            return executeOpenAICompatible(outbound, candidate.provider, apiKey, candidate.model);
          }, candidateTimeout);
        } catch (err) {
          if (err instanceof UpstreamTimeout) {
            attempts.push({ provider: candidate.provider, model: candidate.model, status: 504, message: "Timeout" });
            break; // Don't retry timeouts on the same candidate
          }
          throw err;
        }

        if (response.ok) {
          recordCandidateSuccess(candidate);
          if (env.ENABLE_QUOTA_SHARING === "true" && authenticatedKeyId) {
            recordQuotaShareUsage(authenticatedKeyId);
          }

          // Post-process tool emulation on successful response
          if (needsToolEmulation) {
            try {
              const json = await response.json();
              const processed = postProcessEmulatedResponse(json, request);
              if (wantedStream) return completionToSSE(processed);
              return Response.json(processed, { headers: { "Content-Type": "application/json" } });
            } catch {
              return publicUpstreamError(502);
            }
          }

          return response;
        }

        // Handle errors
        const errBody = await response.text().catch(() => "");
        const sanitised = sanitiseError(errBody, candidate.provider, response.status);
        attempts.push({ provider: candidate.provider, model: candidate.model, status: response.status, message: sanitised });

        // Cooldown on 429
        if (response.status === 429 && apiKey) {
          const cooldownPromise = markKeyRateLimited(env, apiKey, 60);
          if (ctx) ctx.waitUntil(cooldownPromise); // A3: ensure KV write completes
          else await cooldownPromise;
        }

        // Retry on 429/5xx with exponential backoff
        if ((response.status === 429 || response.status >= 500) && attempt < maxRetries - 1) {
          const delay = retryDelay * Math.pow(2, attempt) + Math.random() * 500;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        break; // Non-retryable error, try next candidate

      } catch (err: any) {
        const msg = (err?.message || "Unknown error").slice(0, 100);
        attempts.push({ provider: candidate.provider, model: candidate.model, status: 0, message: msg });
        if (attempt < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, retryDelay * Math.pow(2, attempt)));
          continue;
        }
        break;
      }
    }
  }

  // All candidates exhausted
  console.warn("Cascade exhausted:", JSON.stringify(attempts));
  return Response.json(
    {
      error: {
        message: "All providers failed. Please try again later.",
        type: "cascade_exhausted",
        // Only expose provider name + status, never raw upstream body
        attempts: attempts.map((a) => ({ provider: a.provider, model: a.model, status: a.status })),
      },
    },
    { status: 502 }
  );
}
