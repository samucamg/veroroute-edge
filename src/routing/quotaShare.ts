import type { EnvBindings } from "@/types/provider";

export type QuotaPolicy = "hard" | "soft" | "burst";

export interface QuotaShareConfig {
  poolLimit: number; // Limite global de requisições ou tokens por janela
  windowSeconds: number; // Janela em segundos (padrão 86400 = 1 dia)
  saturationThreshold: number; // 0.7 = 70% de saturação ativa o modo restrito
  defaultWeight: number; // Peso percentual padrão por chave (ex: 20%)
  policy: QuotaPolicy;
}

export interface QuotaShareDecision {
  allowed: boolean;
  mode: "generous" | "strict";
  reason: "ok" | "fair-share-exceeded" | "pool-exhausted";
  penalized?: boolean;
  globalUsedPercent: number;
  consumedByThisKey: number;
  fairShareLimit: number;
}

// Histórico local em memória por isolate para contagem rápida
const keyConsumptionMap: Map<string, { count: number; resetAt: number }> = new Map();
let globalConsumed = 0;
let globalResetAt = Date.now() + 86400 * 1000;

/**
 * Algoritmo Work-Conserving Fair-Share Quota Sharing (Compartilhamento de Cota)
 *
 * Modo Generoso: Se a utilização global do pool for < saturationThreshold (70%),
 * qualquer usuário ativo pode "emprestar" da cota ociosa de outros usuários.
 *
 * Modo Restrito: Quando o pool global atinge a saturação (>= 70%), o algoritmo
 * força fatias estritas de acordo com o peso de cada chave, evitando que um usuário
 * monopolize a cota dos demais.
 */
export async function evaluateQuotaShare(
  apiKeyId: string,
  env: EnvBindings,
  config: Partial<QuotaShareConfig> = {}
): Promise<QuotaShareDecision> {
  const poolLimit = config.poolLimit || 10000;
  const saturationThreshold = config.saturationThreshold || 0.7;
  const policy: QuotaPolicy = config.policy || "burst";
  const weight = config.defaultWeight || 25; // 25% de cota justa
  const fairShareLimit = Math.floor(poolLimit * (weight / 100));

  const now = Date.now();
  if (now > globalResetAt) {
    globalConsumed = 0;
    globalResetAt = now + (config.windowSeconds || 86400) * 1000;
    keyConsumptionMap.clear();
  }

  // Registra consumo do usuário
  const userEntry = keyConsumptionMap.get(apiKeyId) || { count: 0, resetAt: globalResetAt };
  const consumedByThisKey = userEntry.count;
  const globalUsedPercent = poolLimit > 0 ? globalConsumed / poolLimit : 0;

  // 1. Pool Global completamente esgotado (100%)
  if (globalConsumed >= poolLimit) {
    return {
      allowed: false,
      mode: "strict",
      reason: "pool-exhausted",
      globalUsedPercent: 1.0,
      consumedByThisKey,
      fairShareLimit,
    };
  }

  // 2. Modo Generoso (< saturação, ex: < 70% utilizado)
  // Permite que qualquer usuário consuma além do seu fair-share emprestando dos ociosos
  if (globalUsedPercent < saturationThreshold) {
    return {
      allowed: true,
      mode: "generous",
      reason: "ok",
      globalUsedPercent,
      consumedByThisKey,
      fairShareLimit,
    };
  }

  // 3. Modo Restrito (Saturação >= 70%)
  // Aplica a política configurada (hard, soft, burst)
  const isExceedingFairShare = consumedByThisKey >= fairShareLimit;

  if (isExceedingFairShare) {
    if (policy === "hard") {
      return {
        allowed: false,
        mode: "strict",
        reason: "fair-share-exceeded",
        globalUsedPercent,
        consumedByThisKey,
        fairShareLimit,
      };
    }

    if (policy === "soft") {
      // Permite, mas penaliza (ex: para despachar para um modelo fallback gratuito mais lento)
      return {
        allowed: true,
        mode: "strict",
        reason: "fair-share-exceeded",
        penalized: true,
        globalUsedPercent,
        consumedByThisKey,
        fairShareLimit,
      };
    }

    // burst: permite contanto que haja headroom global
    if (policy === "burst") {
      return {
        allowed: globalConsumed < poolLimit,
        mode: "strict",
        reason: globalConsumed < poolLimit ? "ok" : "pool-exhausted",
        globalUsedPercent,
        consumedByThisKey,
        fairShareLimit,
      };
    }
  }

  return {
    allowed: true,
    mode: "strict",
    reason: "ok",
    globalUsedPercent,
    consumedByThisKey,
    fairShareLimit,
  };
}

/**
 * Registra o consumo de uma chamada com sucesso para atualizar o Quota Sharing
 */
export function recordQuotaShareUsage(apiKeyId: string, tokensOrRequests = 1): void {
  globalConsumed += tokensOrRequests;
  const userEntry = keyConsumptionMap.get(apiKeyId) || { count: 0, resetAt: globalResetAt };
  userEntry.count += tokensOrRequests;
  keyConsumptionMap.set(apiKeyId, userEntry);
}
