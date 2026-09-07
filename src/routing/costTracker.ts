import type { EnvBindings } from "@/types/provider";
import type { AuthPrincipal } from "@/admin/auth";
import { getProviderConfig } from "@/config/providers";

/**
 * Cost tracking and budget enforcement using Cloudflare KV.
 * Tracks: total tokens, estimated cost per virtual key and globally.
 * Budget limits: optional per-key spending caps (daily/monthly).
 */

interface UsageRecord {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  requestCount: number;
  lastUpdated: number;
}

interface BudgetConfig {
  dailyLimitUsd?: number;
  monthlyLimitUsd?: number;
}

function usageKey(scope: string, id: string, period: string): string {
  return `usage:${scope}:${id}:${period}`;
}

function getCurrentPeriods(): { day: string; month: string } {
  const now = new Date();
  return {
    day: now.toISOString().slice(0, 10),      // YYYY-MM-DD
    month: now.toISOString().slice(0, 7),     // YYYY-MM
  };
}

/**
 * Estimate cost based on provider pricing and token counts.
 */
export function estimateCost(
  providerId: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const cfg = getProviderConfig(providerId);
  if (!cfg) return 0;
  const inputCost = (promptTokens / 1_000_000) * cfg.costPerMillionInput;
  const outputCost = (completionTokens / 1_000_000) * cfg.costPerMillionOutput;
  return inputCost + outputCost;
}

/**
 * Record usage after a successful completion.
 * Call with ctx.waitUntil to avoid blocking the response.
 */
export async function recordUsage(
  env: EnvBindings,
  principal: AuthPrincipal,
  providerId: string,
  promptTokens: number,
  completionTokens: number,
): Promise<void> {
  const kv = env.OMNI_CACHE;
  if (!kv) return;

  const cost = estimateCost(providerId, promptTokens, completionTokens);
  const periods = getCurrentPeriods();
  const scope = principal.kind === "virtual" ? principal.id : "master";

  for (const [periodType, period] of Object.entries(periods)) {
    const key = usageKey(scope, periodType, period);
    try {
      const raw = await kv.get(key);
      const record: UsageRecord = raw ? JSON.parse(raw) : {
        promptTokens: 0, completionTokens: 0, totalTokens: 0,
        estimatedCostUsd: 0, requestCount: 0, lastUpdated: 0,
      };
      record.promptTokens += promptTokens;
      record.completionTokens += completionTokens;
      record.totalTokens += promptTokens + completionTokens;
      record.estimatedCostUsd += cost;
      record.requestCount += 1;
      record.lastUpdated = Date.now();
      // TTL: 35 days for daily, 400 days for monthly
      const ttl = periodType === "day" ? 35 * 86400 : 400 * 86400;
      await kv.put(key, JSON.stringify(record), { expirationTtl: ttl });
    } catch { /* non-fatal */ }
  }
}

/**
 * Check budget limits before allowing a request.
 * Returns null if allowed, or a 402 Payment Required response if budget exceeded.
 */
export async function checkBudget(
  env: EnvBindings,
  principal: AuthPrincipal,
  budget?: BudgetConfig,
): Promise<Response | null> {
  if (!budget || (!budget.dailyLimitUsd && !budget.monthlyLimitUsd)) return null;
  const kv = env.OMNI_CACHE;
  if (!kv) return null;

  const periods = getCurrentPeriods();
  const scope = principal.kind === "virtual" ? principal.id : "master";

  try {
    if (budget.dailyLimitUsd) {
      const key = usageKey(scope, "day", periods.day);
      const raw = await kv.get(key);
      if (raw) {
        const record: UsageRecord = JSON.parse(raw);
        if (record.estimatedCostUsd >= budget.dailyLimitUsd) {
          return Response.json(
            { error: { message: `Daily budget exceeded ($${budget.dailyLimitUsd.toFixed(2)})`, type: "budget_exceeded" } },
            { status: 402 },
          );
        }
      }
    }
    if (budget.monthlyLimitUsd) {
      const key = usageKey(scope, "month", periods.month);
      const raw = await kv.get(key);
      if (raw) {
        const record: UsageRecord = JSON.parse(raw);
        if (record.estimatedCostUsd >= budget.monthlyLimitUsd) {
          return Response.json(
            { error: { message: `Monthly budget exceeded ($${budget.monthlyLimitUsd.toFixed(2)})`, type: "budget_exceeded" } },
            { status: 402 },
          );
        }
      }
    }
  } catch { /* non-fatal, allow request */ }

  return null;
}

/**
 * Get usage summary for a principal.
 */
export async function getUsageSummary(
  env: EnvBindings,
  principalId: string,
): Promise<{ daily: UsageRecord | null; monthly: UsageRecord | null }> {
  const kv = env.OMNI_CACHE;
  if (!kv) return { daily: null, monthly: null };

  const periods = getCurrentPeriods();
  const [dailyRaw, monthlyRaw] = await Promise.all([
    kv.get(usageKey(principalId, "day", periods.day)),
    kv.get(usageKey(principalId, "month", periods.month)),
  ]);

  return {
    daily: dailyRaw ? JSON.parse(dailyRaw) : null,
    monthly: monthlyRaw ? JSON.parse(monthlyRaw) : null,
  };
}
