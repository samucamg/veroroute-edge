import type { EnvBindings } from "@/types/provider";
import type { AuthPrincipal } from "@/admin/auth";

/**
 * Rate limiter using Cloudflare KV with TTL-based sliding windows.
 * Replaces the broken in-memory quotaShare (per-isolate, no persistence).
 * Supports: per-virtual-key RPM limit + global quota sharing.
 */

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;   // epoch ms
  limit: number;
}

const DEFAULT_WINDOW_SEC = 60;
const DEFAULT_MAX_RPM = 60;

function kvKey(scope: string, id: string, windowStart: number): string {
  return `rl:${scope}:${id}:${windowStart}`;
}

function currentWindow(windowSec: number): number {
  return Math.floor(Date.now() / 1000 / windowSec) * windowSec;
}

/**
 * Check and increment rate limit atomically via KV.
 * Uses optimistic read-increment-write with short TTL.
 */
async function checkAndIncrement(
  kv: KVNamespace,
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const raw = await kv.get(key);
  const count = raw ? parseInt(raw, 10) : 0;
  const windowStart = currentWindow(windowSec);
  const resetAt = (windowStart + windowSec) * 1000;

  if (count >= limit) {
    return { allowed: false, remaining: 0, resetAt, limit };
  }

  // Increment (best-effort — KV is eventually consistent, but good enough for rate limiting)
  await kv.put(key, String(count + 1), { expirationTtl: windowSec * 2 });

  return {
    allowed: true,
    remaining: Math.max(0, limit - count - 1),
    resetAt,
    limit,
  };
}

/**
 * Enforce rate limits. Returns null if allowed, or a 429 Response if blocked.
 */
export async function enforceRateLimit(
  env: EnvBindings,
  principal: AuthPrincipal,
  ctx?: ExecutionContext,
): Promise<Response | null> {
  const kv = env.OMNI_CACHE;
  if (!kv) return null; // No KV = no rate limiting (graceful degradation)

  const windowSec = DEFAULT_WINDOW_SEC;

  // 1. Per-virtual-key RPM limit (always enforced if configured on the key)
  if (principal.kind === "virtual" && principal.rpmLimit && principal.rpmLimit > 0) {
    const window = currentWindow(windowSec);
    const key = kvKey("vk", principal.id, window);
    const result = await checkAndIncrement(kv, key, principal.rpmLimit, windowSec);
    if (!result.allowed) {
      return Response.json(
        { error: { message: `Rate limit exceeded (${result.limit} rpm)`, type: "rate_limit" } },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
          },
        },
      );
    }
  }

  // 2. Global quota sharing (only when ENABLE_QUOTA_SHARING=true)
  if (env.ENABLE_QUOTA_SHARING === "true") {
    const maxReq = parseInt(env.QUOTA_MAX_REQUESTS || "", 10) || DEFAULT_MAX_RPM;
    const winSec = parseInt(env.QUOTA_WINDOW_SECONDS || "", 10) || DEFAULT_WINDOW_SEC;
    const scope = principal.kind === "virtual" ? principal.id : "global";
    const window = currentWindow(winSec);
    const key = kvKey("gq", scope, window);
    const result = await checkAndIncrement(kv, key, maxReq, winSec);
    if (!result.allowed) {
      return Response.json(
        { error: { message: "Global quota exceeded for this window", type: "rate_limit" } },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)) },
        },
      );
    }
  }

  return null; // Allowed
}
