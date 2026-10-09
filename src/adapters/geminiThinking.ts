/**
 * Controle de "thinking" para o provedor gemini (Google AI Studio).
 *
 * Sem thinkingConfig, os modelos Gemini 3.x e os aliases "-latest" raciocinam
 * por padrão: um "Respond with OK" levava 6–49s e, com max_tokens baixo, os
 * tokens de raciocínio consumiam todo o orçamento e a resposta vinha vazia
 * (finishReason=MAX_TOKENS). Medido em scripts/gemini-latency-bench.mjs.
 *
 * Não se aplica ao Antigravity: lá o nível vem no nome do modelo (-high/-medium/-low).
 */
export type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high";

/** Padrão de produção quando o cliente não envia reasoning_effort. */
export const DEFAULT_GEMINI_REASONING_EFFORT: ReasoningEffort = "low";

const EFFORTS: ReasoningEffort[] = ["none", "minimal", "low", "medium", "high"];

export function normalizeReasoningEffort(value: unknown): ReasoningEffort {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  return (EFFORTS as string[]).includes(v) ? (v as ReasoningEffort) : DEFAULT_GEMINI_REASONING_EFFORT;
}

type ThinkingFamily = "gemini3" | "gemini25-flash" | "gemini25-pro" | "none";

/** Família de thinking do modelo; "none" = modelo sem suporte (2.0, 1.5, gemma, embeddings...). */
export function geminiThinkingFamily(model: string): ThinkingFamily {
  const m = (model || "").toLowerCase().replace(/^models\//, "").replace(/^gemini\//, "");
  if (/^gemini-[3-9]/.test(m) || /^gemini-(flash|flash-lite|pro)-latest$/.test(m)) return "gemini3";
  if (/^gemini-2\.5-.*pro/.test(m)) return "gemini25-pro";
  if (/^gemini-2\.5-/.test(m)) return "gemini25-flash";
  return "none";
}

/** thinkingConfig da API nativa (generationConfig.thinkingConfig) ou undefined se não se aplica. */
export function buildGeminiThinkingConfig(model: string, effortRaw: unknown): Record<string, unknown> | undefined {
  const family = geminiThinkingFamily(model);
  if (family === "none") return undefined;
  const effort = normalizeReasoningEffort(effortRaw);

  if (family === "gemini3") {
    // thinkingBudget=0 foi o caminho medido e aceito para desligar; os demais usam thinkingLevel.
    if (effort === "none" || effort === "minimal") return { thinkingBudget: 0 };
    return { thinkingLevel: effort };
  }

  const budgets: Record<ReasoningEffort, number> = { none: 0, minimal: 512, low: 1024, medium: 8192, high: 24576 };
  let budget = budgets[effort];
  // O 2.5 Pro não aceita desligar o thinking (mínimo 128).
  if (family === "gemini25-pro" && budget < 128) budget = 128;
  return { thinkingBudget: budget };
}

/** Valor de reasoning_effort para a camada OpenAI-compat (chaves "AQ.") ou undefined. */
export function geminiCompatReasoningEffort(model: string, effortRaw: unknown): string | undefined {
  if (geminiThinkingFamily(model) === "none") return undefined;
  const effort = normalizeReasoningEffort(effortRaw);
  return effort === "minimal" ? "none" : effort;
}
