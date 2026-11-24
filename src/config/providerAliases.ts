/**
 * Aliases de provedores e utilitários de URL/prefixo de modelos.
 *
 * Este é o ÚNICO lugar do projeto onde aliases como "agy" são conhecidos.
 * Camadas de persistência (KV), roteamento e UI devem apenas chamar
 * normalizeProviderId() em vez de repetir comparações hardcoded.
 */

/** Base URL da API nativa do Google AI Studio (Gemini). */
export const GEMINI_NATIVE_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

/** Base URL da camada compatível com OpenAI do Google AI Studio. */
export const GEMINI_OPENAI_COMPAT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

const PROVIDER_ALIASES: Record<string, string> = {
  agy: "antigravity",
  "antigravity-cli": "antigravity",
  // Kiro AI aliases
  kr: "kiro",
  "kiro-ai": "kiro",
  "amazon-q": "kiro",
  // Aliases antigos/gerados a partir dos nomes dos templates da interface.
  "openrouter-free": "openrouter",
  "openrouter-free-models": "openrouter",
  "groq-lpu-ultra-fast-inference": "groq",
  "cerebras-wse-3": "cerebras",
  "cloudflare-workers-ai-native": "cloudflare-ai",
};

/** Converte um alias de provedor no seu id canônico. */
export function normalizeProviderId(providerId: string): string {
  const id = (providerId || "").trim();
  if (!id) return id;
  return PROVIDER_ALIASES[id.toLowerCase()] || id;
}

/** Remove barras finais de uma URL. */
export function stripTrailingSlashes(url: string): string {
  return (url || "").trim().replace(/\/+$/, "");
}

/**
 * Detecta base URLs que expõem a superfície compatível com OpenAI.
 * Exemplos reais:
 *   https://generativelanguage.googleapis.com/v1beta/openai/
 *   https://generativelanguage.googleapis.com/v1beta/openai/v1
 *   https://api.groq.com/openai/v1
 */
export function isOpenAICompatBaseUrl(baseUrl: string): boolean {
  const url = stripTrailingSlashes(baseUrl).toLowerCase();
  if (!url) return false;
  if (url.endsWith("/openai")) return true;
  if (/\/openai\/v\d+$/.test(url)) return true;
  return false;
}

/**
 * Prefixos de chave de API do Google AI Studio.
 *
 * Verificado contra a API real:
 *   AIza…  -> aceita pela superfície nativa (?key= / x-goog-api-key) e pela
 *             camada compatível com OpenAI (Authorization: Bearer).
 *   AQ.…   -> NÃO é aceita pela superfície nativa (401 "invalid authentication
 *             credentials"); a camada compatível com OpenAI responde
 *             "Invalid Auth key" quando a chave é inválida, ou seja, é lá que
 *             essas chaves são autenticadas.
 */
export function isGoogleAiStudioKey(apiKey: string): boolean {
  return /^AQ\./i.test((apiKey || "").trim());
}

/**
 * Decide a superfície de listagem/uso do Gemini a partir da base URL.
 *   "openai" -> {base}/models com Authorization: Bearer (apenas quando baseUrl termina em /openai)
 *   "native" -> {base}/models com ?key= (aceita chaves AIza... e AQ.... e suporta gemma-4-* / gemini-4-*)
 */
export function resolveGeminiSurface(baseUrl: string, _apiKey: string): "openai" | "native" {
  if (isOpenAICompatBaseUrl(baseUrl)) return "openai";
  return "native";
}

/** Monta a URL de listagem de modelos (/models) a partir de um base URL. */
export function buildModelsUrl(baseUrl: string): string {
  const clean = stripTrailingSlashes(baseUrl);
  if (!clean) return "";
  if (/\/models$/.test(clean)) return clean;
  return clean + "/models";
}

/**
 * Extrai a lista de ids de modelos das respostas usuais de /models:
 *   { data: [{ id }] } | { models: [{ id|name }] } | [{ id }] | { models: { slug: {...} } }
 */
export function extractModelIds(payload: unknown): string[] {
  const p = payload as any;
  const list = Array.isArray(p)
    ? p
    : (p?.data ?? p?.models ?? p?.availableModels ?? p?.available_models ?? p?.candidates);

  if (Array.isArray(list)) {
    return list
      .map((entry: any) =>
        typeof entry === "string" ? entry : entry?.id || entry?.name || entry?.model
      )
      .filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
      .map((id: string) => id.replace(/^models\//, ""));
  }

  // Mapas { "model-id": { displayName } } (ex.: Cloud Code Assist)
  if (list && typeof list === "object") {
    return Object.keys(list as Record<string, unknown>).filter(Boolean);
  }

  return [];
}
