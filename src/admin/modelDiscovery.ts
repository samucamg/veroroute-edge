/**
 * Descoberta Unificada de Modelos Upstream (Model Discovery Pipeline)
 *
 * Concentra e padroniza a listagem de modelos para todos os provedores:
 *  - Provedores com endpoints dinâmicos (OpenAI, OpenRouter, Groq, Cerebras, Pollinations, Antigravity, Gemini);
 *  - Provedores sem endpoints públicos de listagem (1min, Azure sem endpoint configurado, Bedrock sem proxy)
 *    declarando explicitamente discoverySupported: false.
 */

import { ANTIGRAVITY_PUBLIC_CONFIG } from "@/config/constants";
import { getStaticCatalog } from "@/config/modelRegistry";
import {
  GEMINI_NATIVE_BASE_URL,
  GEMINI_OPENAI_COMPAT_BASE_URL,
  buildModelsUrl,
  extractModelIds,
  isOpenAICompatBaseUrl,
  normalizeProviderId,
  resolveGeminiSurface,
  stripTrailingSlashes,
} from "@/config/providerAliases";
import type { EnvBindings } from "@/types/provider";

export { GEMINI_NATIVE_BASE_URL, GEMINI_OPENAI_COMPAT_BASE_URL };

/** Resultado padronizado de uma tentativa de descoberta upstream. */
export interface DiscoveryResult {
  models: string[];
  error: string | null;
  /** "upstream" = lista real da API; "catalog" = catálogo local de fallback. */
  source: "upstream" | "catalog";
  /** Diagnóstico por tentativa (status HTTP / formato da resposta). */
  attempts?: string[];
  /** Indica explicitamente se o provedor suporta endpoint de descoberta dinâmica. */
  discoverySupported: boolean;
}

export interface DiscoverCredentials {
  apiKey?: string;
  baseUrl?: string;
  authType?: string;
  headerName?: string;
  protocol?: string;
  env?: EnvBindings;
}

// ---------------------------------------------------------------------------
// Cloud Code Assist (Antigravity CLI / "agy")
// ---------------------------------------------------------------------------

const ANTIGRAVITY_DISCOVERY_HOSTS = [
  "https://daily-cloudcode-pa.googleapis.com",
  "https://cloudcode-pa.googleapis.com",
];

function orderAntigravityModels(ids: string[], payload: any): string[] {
  const available = new Set(ids);
  const ordered: string[] = [];

  const push = (id: unknown) => {
    if (typeof id !== "string") return;
    const clean = id.replace(/^models\//, "");
    if (/^(tab_|chat_)/i.test(clean)) return;
    if (available.has(clean) && !ordered.includes(clean)) ordered.push(clean);
  };

  const sorts = Array.isArray(payload?.agentModelSorts) ? payload.agentModelSorts : [];
  const recommended = sorts.filter(
    (sort: any) => String(sort?.displayName || "").toLowerCase() === "recommended"
  );
  const others = sorts.filter((sort: any) => !recommended.includes(sort));

  for (const sort of [...recommended, ...others]) {
    for (const group of sort?.groups || []) {
      for (const modelId of group?.modelIds || []) push(modelId);
    }
  }

  push(payload?.defaultAgentModelId);
  for (const id of [...available].sort()) push(id);

  return ordered;
}

function antigravityPayload(json: any): any {
  if (json && typeof json === "object" && json.response && typeof json.response === "object") {
    if (json.response.models || json.response.availableModels || json.response.available_models) {
      return json.response;
    }
  }
  return json;
}

export async function fetchAntigravityAvailableModels(
  accessToken: string,
  projectId?: string,
  timeoutMs = 8000
): Promise<DiscoveryResult> {
  if (!accessToken) {
    return {
      models: getStaticCatalog("antigravity"),
      error: "Access token do Antigravity ausente",
      source: "catalog",
      discoverySupported: true,
      attempts: [],
    };
  }

  const project = (projectId || ANTIGRAVITY_PUBLIC_CONFIG.defaultProjectId || "").trim();
  const body = JSON.stringify(project ? { project } : {});
  const attempts: string[] = [];
  let lastError: string | null = null;

  for (const host of ANTIGRAVITY_DISCOVERY_HOSTS) {
    const shortHost = host.replace("https://", "");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(host + ANTIGRAVITY_PUBLIC_CONFIG.fetchAvailableModelsPath, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": ANTIGRAVITY_PUBLIC_CONFIG.userAgent,
        },
        body,
        signal: controller.signal,
      });

      const rawBody = await res.text().catch(() => "");

      if (!res.ok) {
        const detail = rawBody.replace(/\s+/g, " ").slice(0, 140);
        attempts.push(`${shortHost} HTTP ${res.status}${detail ? " — " + detail : ""}`);
        lastError = `Cloud Code Assist HTTP ${res.status} (${shortHost})`;
        continue;
      }

      let json: any = null;
      try {
        json = JSON.parse(rawBody);
      } catch {
        attempts.push(`${shortHost} HTTP 200 mas resposta não-JSON: ${rawBody.replace(/\s+/g, " ").slice(0, 120)}`);
        lastError = "Cloud Code Assist devolveu resposta não-JSON";
        continue;
      }

      const payload = antigravityPayload(json);
      const raw = extractModelIds(payload);

      if (raw.length > 0) {
        return {
          models: orderAntigravityModels(raw, payload),
          error: null,
          source: "upstream",
          discoverySupported: true,
          attempts,
        };
      }

      attempts.push(`${shortHost} HTTP 200 sem modelos`);
      lastError = "Cloud Code Assist respondeu sem modelos";
    } catch (err: any) {
      const detail = err?.name === "AbortError" ? `timeout ${timeoutMs}ms` : err?.message || String(err);
      attempts.push(`${shortHost} falhou — ${detail}`);
      lastError = err?.name === "AbortError" ? `Timeout ao consultar Cloud Code Assist (${timeoutMs}ms)` : detail;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    models: getStaticCatalog("antigravity"),
    error: lastError || "Falha na descoberta Antigravity",
    source: "catalog",
    discoverySupported: true,
    attempts,
  };
}

// ---------------------------------------------------------------------------
// Gemini (AI Studio) — OpenAI Compat & Nativo
// ---------------------------------------------------------------------------

export async function fetchGeminiOpenAICompatModels(
  baseUrl: string,
  apiKey: string,
  timeoutMs = 8000
): Promise<DiscoveryResult> {
  const url = buildModelsUrl(baseUrl || GEMINI_OPENAI_COMPAT_BASE_URL);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: apiKey ? `Bearer ${apiKey}` : "",
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      const errJson: any = await res.json().catch(() => ({}));
      return {
        models: getStaticCatalog("gemini"),
        error: errJson?.error?.message || `Google OpenAI-compat HTTP ${res.status}`,
        source: "catalog",
        discoverySupported: true,
        attempts: [`${url} HTTP ${res.status}`],
      };
    }

    const json: any = await res.json().catch(() => ({}));
    const models = extractModelIds(json);
    return {
      models: models.length > 0 ? models : getStaticCatalog("gemini"),
      error: models.length > 0 ? null : "Resposta da camada OpenAI-compat sem modelos",
      source: models.length > 0 ? "upstream" : "catalog",
      discoverySupported: true,
      attempts: [`${url} HTTP ${res.status} (${models.length} modelos)`],
    };
  } catch (err: any) {
    return {
      models: getStaticCatalog("gemini"),
      error: err?.name === "AbortError" ? `Timeout ao consultar ${url} (${timeoutMs}ms)` : err?.message || String(err),
      source: "catalog",
      discoverySupported: true,
      attempts: [`${url} falhou`],
    };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Pipeline Centralizado: discoverModels
// ---------------------------------------------------------------------------

export async function discoverModels(
  providerId: string,
  credentials: DiscoverCredentials = {},
  timeoutMs = 8000
): Promise<DiscoveryResult> {
  const id = normalizeProviderId(providerId);
  const apiKey = credentials.apiKey?.trim() || "";
  const baseUrl = stripTrailingSlashes(credentials.baseUrl || "");

  // 1. Provedores sem suporte a listagem dinâmica upstream
  if (id === "cloudflare-ai" || baseUrl === "workers-ai") {
    return {
      models: getStaticCatalog("cloudflare-ai"),
      error: null,
      source: "catalog",
      discoverySupported: false,
      attempts: ["Cloudflare Workers AI opera via modelos nativos do binding env.AI."],
    };
  }

  if (id === "azure" && (!baseUrl || baseUrl.includes("https://openai.azure.com"))) {
    return {
      models: getStaticCatalog("azure"),
      error: "Azure: Configure a URL do seu recurso Azure (ex: https://seu-recurso.openai.azure.com) no campo Endpoint.",
      source: "catalog",
      discoverySupported: false,
      attempts: ["Azure sem endpoint customizado configurado."],
    };
  }

  if (id === "bedrock" && (!baseUrl || baseUrl.includes("amazonaws.com"))) {
    return {
      models: getStaticCatalog("bedrock"),
      error: apiKey ? null : "AWS Bedrock: Catálogo de Foundation Models disponível. Configure endpoint de proxy para testes.",
      source: "catalog",
      discoverySupported: false,
      attempts: ["AWS Bedrock requer proxy ou SigV4 para consulta dinâmica."],
    };
  }

  // 2. Google Cloud Code Assist (Antigravity)
  if (id === "antigravity") {
    let accessToken = apiKey;
    let projectId = "";
    if (!accessToken && credentials.env) {
      try {
        const { getValidAntigravityAccessToken, discoverCompanionProject } = await import("@/oauth/antigravity");
        const agyAuth = await getValidAntigravityAccessToken(credentials.env).catch(() => null);
        if (agyAuth?.accessToken) {
          accessToken = agyAuth.accessToken;
          projectId = agyAuth.projectId || "";
          if (!projectId) {
            projectId = await discoverCompanionProject(accessToken).catch(() => "");
          }
        }
      } catch {}
    }

    if (!accessToken) {
      return {
        models: getStaticCatalog("antigravity"),
        error: "Antigravity: Login OAuth pendente. Para conectar sua conta Google, use a aba Antigravity OAuth.",
        source: "catalog",
        discoverySupported: true,
        attempts: ["Nenhum token OAuth ativo encontrado"],
      };
    }

    return fetchAntigravityAvailableModels(accessToken, projectId, timeoutMs);
  }

  // 3. Google Gemini (AI Studio)
  if (id === "gemini") {
    const requestedGeminiBaseUrl = baseUrl || GEMINI_NATIVE_BASE_URL;
    const geminiUsesOpenAICompat = resolveGeminiSurface(requestedGeminiBaseUrl, apiKey) === "openai";
    const effectiveBaseUrl = geminiUsesOpenAICompat && !/\/openai(?:\/v\d+)?$/i.test(requestedGeminiBaseUrl)
      ? GEMINI_OPENAI_COMPAT_BASE_URL
      : requestedGeminiBaseUrl;

    if (apiKey && geminiUsesOpenAICompat) {
      return fetchGeminiOpenAICompatModels(effectiveBaseUrl, apiKey, timeoutMs);
    }

    if (apiKey) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(`${effectiveBaseUrl}/models?key=${encodeURIComponent(apiKey)}`, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const json: any = await res.json().catch(() => ({}));
          const models = extractModelIds(json);
          if (models.length > 0) {
            return {
              models,
              error: null,
              source: "upstream",
              discoverySupported: true,
            };
          }
        }
      } catch {}

      // Fallback para superfície OpenAI-compat
      return fetchGeminiOpenAICompatModels(GEMINI_OPENAI_COMPAT_BASE_URL, apiKey, timeoutMs);
    }

    return {
      models: getStaticCatalog("gemini"),
      error: "Catálogo oficial Gemini disponível. Digite sua chave de API para sincronizar modelos personalizados.",
      source: "catalog",
      discoverySupported: true,
    };
  }

  // 4. Pollinations.ai (Keyless)
  if (id === "pollinations") {
    const url = "https://gen.pollinations.ai/models";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
      clearTimeout(timer);

      if (res.status === 429) {
        return {
          models: getStaticCatalog("pollinations"),
          error: "Pollinations: Limite de fila por IP compartilhado da Cloudflare atingido (429). Aguarde alguns instantes para retestar.",
          source: "catalog",
          discoverySupported: true,
          attempts: [`${url} HTTP 429 (Egress rate-limit Cloudflare)`],
        };
      }

      if (res.ok) {
        const json: any = await res.json().catch(() => []);
        const models = extractModelIds(json);
        if (models.length > 0) {
          return {
            models,
            error: null,
            source: "upstream",
            discoverySupported: true,
          };
        }
      }

      return {
        models: getStaticCatalog("pollinations"),
        error: `Pollinations HTTP ${res.status}`,
        source: "catalog",
        discoverySupported: true,
      };
    } catch (err: any) {
      clearTimeout(timer);
      return {
        models: getStaticCatalog("pollinations"),
        error: err?.name === "AbortError" ? "Timeout ao consultar Pollinations (8s)" : (err?.message || String(err)),
        source: "catalog",
        discoverySupported: true,
      };
    }
  }

  // 5. OpenRouter
  if (id === "openrouter" || id === "openrouter-free") {
    const url = "https://openrouter.ai/api/v1/models";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const headers: Record<string, string> = { Accept: "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    try {
      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const json: any = await res.json().catch(() => ({}));
        let models = extractModelIds(json);
        if (id === "openrouter-free") {
          const free = models.filter((m) => m.endsWith(":free"));
          if (free.length > 0) models = free;
        }
        if (models.length > 0) {
          return {
            models,
            error: null,
            source: "upstream",
            discoverySupported: true,
          };
        }
      }
      return {
        models: getStaticCatalog("openrouter"),
        error: `OpenRouter HTTP ${res.status}`,
        source: "catalog",
        discoverySupported: true,
      };
    } catch (err: any) {
      clearTimeout(timer);
      return {
        models: getStaticCatalog("openrouter"),
        error: err?.name === "AbortError" ? "Timeout ao consultar OpenRouter (8s)" : (err?.message || String(err)),
        source: "catalog",
        discoverySupported: true,
      };
    }
  }

  // 5.1 DeepSeek Official API (GET https://api.deepseek.com/models)
  if (id === "deepseek") {
    const url = "https://api.deepseek.com/models";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const headers: Record<string, string> = { Accept: "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    try {
      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const json: any = await res.json().catch(() => ({}));
        const models = extractModelIds(json);
        if (models.length > 0) {
          return {
            models,
            error: null,
            source: "upstream",
            discoverySupported: true,
          };
        }
      }
      return {
        models: getStaticCatalog("deepseek"),
        error: apiKey ? `DeepSeek HTTP ${res.status}` : "Informe sua chave DeepSeek para listar os modelos da conta",
        source: "catalog",
        discoverySupported: true,
      };
    } catch (err: any) {
      clearTimeout(timer);
      return {
        models: getStaticCatalog("deepseek"),
        error: err?.name === "AbortError" ? "Timeout ao consultar DeepSeek (8s)" : (err?.message || String(err)),
        source: "catalog",
        discoverySupported: true,
      };
    }
  }

  // 6. Generic OpenAI-compatible / Anthropic / Custom Base URL
  if (baseUrl) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const url = buildModelsUrl(baseUrl);
    const headers: Record<string, string> = { Accept: "application/json" };

    if (credentials.authType === "anthropic" || credentials.protocol === "anthropic") {
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
    } else if (credentials.authType === "apikey-header") {
      headers[credentials.headerName || "api-key"] = apiKey;
    } else if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    try {
      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const json: any = await res.json().catch(() => ({}));
        const models = extractModelIds(json);
        if (models.length > 0) {
          return {
            models,
            error: null,
            source: "upstream",
            discoverySupported: true,
          };
        }
        return {
          models: getStaticCatalog(id),
          error: "Upstream respondeu sem modelos",
          source: "catalog",
          discoverySupported: true,
        };
      }
      return {
        models: getStaticCatalog(id),
        error: `Upstream HTTP ${res.status}`,
        source: "catalog",
        discoverySupported: true,
      };
    } catch (err: any) {
      clearTimeout(timer);
      return {
        models: getStaticCatalog(id),
        error: err?.name === "AbortError" ? "Timeout ao consultar upstream (8s)" : (err?.message || String(err)),
        source: "catalog",
        discoverySupported: true,
      };
    }
  }

  // 7. Fallback catálogo estático padrão
  return {
    models: getStaticCatalog(id),
    error: apiKey ? "Nenhum endpoint de descoberta disponível para este provedor" : "Cadastre uma chave de API para habilitar testes e sincronização",
    source: "catalog",
    discoverySupported: false,
  };
}
