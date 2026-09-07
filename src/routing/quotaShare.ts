import type { EnvBindings } from "@/types/provider";

// Quota sharing per authenticated API key ID.
// Fixes: M-8 (correct first window init), M-9 (recording only under flag)

export interface QuotaShareConfig {
  maxRequests: number;
  windowSeconds: number;
  policy: "burst" | "smooth";
}

interface WindowState {
  count: number;
  windowStart: number;
}

const quotaWindows: Map<string, WindowState> = new Map();

const DEFAULT_QUOTA: QuotaShareConfig = {
  maxRequests: 100,
  windowSeconds: 60,
  policy: "burst",
};

function getConfig(env: EnvBindings): QuotaShareConfig {
  const max = parseInt(env.QUOTA_MAX_REQUESTS || "", 10);
  const win = parseInt(env.QUOTA_WINDOW_SECONDS || "", 10);
  return {
    maxRequests: isNaN(max) ? DEFAULT_QUOTA.maxRequests : max,
    windowSeconds: isNaN(win) ? DEFAULT_QUOTA.windowSeconds : win,
    policy: (env.QUOTA_POLICY as QuotaShareConfig["policy"]) || DEFAULT_QUOTA.policy,
  };
}

export function evaluateQuotaShare(
  apiKeyId: string,
  env: EnvBindings
): { allowed: boolean; remaining: number; resetAt: number } {
  const cfg = getConfig(env);
  const now = Date.now();
  const windowMs = cfg.windowSeconds * 1000;
  let state = quotaWindows.get(apiKeyId);
  if (!state) {
    state = { count: 0, windowStart: now };
    quotaWindows.set(apiKeyId, state);
  }
  if (now - state.windowStart >= windowMs) {
    state.count = 0;
    state.windowStart = now;
  }
  const allowed = state.count < cfg.maxRequests;
  const remaining = Math.max(0, cfg.maxRequests - state.count);
  const resetAt = state.windowStart + windowMs;
  return { allowed, remaining, resetAt };
}

export function recordQuotaShareUsage(apiKeyId: string, _tokensOrRequests = 1): void {
  const state = quotaWindows.get(apiKeyId);
  if (state) state.count += 1;
}