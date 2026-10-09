/**
 * Classifica falhas de upstream pelo ESCOPO do problema, para a cascata saber
 * o que punir e o que tentar a seguir:
 *
 *  - "key":       a chave/conta é inválida ou sem acesso (401, 402, 403).
 *                 Tira a chave inteira do rodízio por 30 min.
 *  - "quota":     a cota desta chave PARA ESTE MODELO acabou (429). Os limites do Gemini
 *                 são por modelo, então só o par (chave, modelo) entra em cooldown:
 *                 a mesma chave continua servindo os outros modelos do combo.
 *  - "model":     o modelo não existe ou não está disponível PARA ESTA CHAVE (404).
 *                 Ex.: Gemini 2.5 Flash devolve 404 "no longer available to new users"
 *                 em projetos novos, mas funciona em projetos antigos. Bloqueia o par
 *                 (chave, modelo) e tenta outra chave.
 *  - "transient": instabilidade do provedor (timeout, 5xx, 503 "high demand").
 *                 Vai direto para o próximo candidato e conta para o circuit breaker.
 *  - "request":   a requisição em si foi rejeitada (400, 413, 422). Nenhuma chave
 *                 é punida (outro cliente pode mandar um pedido válido); próximo candidato.
 *
 * Antes, toda falha contava para o circuito do PROVEDOR inteiro: um 404 de um modelo
 * podia derrubar por 5 minutos os outros modelos saudáveis do mesmo provedor.
 */
export type FailureScope = "key" | "quota" | "model" | "transient" | "request";

export interface FailureClass {
  scope: FailureScope;
  /** Cooldown sugerido (segundos) para "key" e "model". */
  cooldownSec?: number;
  reason: string;
}

const KEY_INVALID_COOLDOWN_SEC = 30 * 60;
const MODEL_UNAVAILABLE_COOLDOWN_SEC = 6 * 60 * 60;
const RATE_LIMIT_MINUTE_COOLDOWN_SEC = 60;

// Google: quotaId "GenerateRequestsPerDayPerProjectPerModel-FreeTier";
// Groq: "requests per day (RPD)"; outros: "daily limit".
const DAILY_QUOTA_RE = /per[\s_-]?day|perday|daily|\bRPD\b/i;

/** Segundos até a próxima meia-noite no horário do Pacífico (reset do RPD do Gemini). */
export function secondsUntilPacificMidnight(now: number = Date.now()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(now));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const elapsed = (get("hour") % 24) * 3600 + get("minute") * 60 + get("second");
  return Math.min(86400, Math.max(60, 86400 - elapsed));
}

export function classifyUpstreamFailure(status: number, body = "", now: number = Date.now()): FailureClass {
  const text = body || "";

  if (status === 429) {
    if (DAILY_QUOTA_RE.test(text)) {
      return { scope: "quota", cooldownSec: secondsUntilPacificMidnight(now), reason: "Cota diária esgotada" };
    }
    return { scope: "quota", cooldownSec: RATE_LIMIT_MINUTE_COOLDOWN_SEC, reason: "Rate limit" };
  }
  if (status === 401 || status === 402 || status === 403) {
    return { scope: "key", cooldownSec: KEY_INVALID_COOLDOWN_SEC, reason: `Chave sem acesso (${status})` };
  }
  if (status === 404) {
    return { scope: "model", cooldownSec: MODEL_UNAVAILABLE_COOLDOWN_SEC, reason: "Modelo indisponível para esta chave" };
  }
  if (status === 408 || status >= 500) {
    return { scope: "transient", reason: `Instabilidade do provedor (${status})` };
  }
  return { scope: "request", reason: `Requisição rejeitada (${status})` };
}
