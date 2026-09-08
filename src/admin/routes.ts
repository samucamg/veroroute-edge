import { Hono } from "hono";
import { PROVIDER_REGISTRY, getProviderConfig } from "@/config/providers";
import {
  getAdminConfig,
  mutateAdminConfig,
  deleteCombo,
  slugifyProviderId,
  appendProviderKeys,
  appendProviderCredentials,
  setStoredProviderCredentials,
  removeProviderKeys,
  getCustomProviderKeys,
  type CustomProvider,
  type ComboConfig,
} from "./store";
import { extractBearer, resolvePrincipal, serverMisconfigured, unauthorized, maskSecret } from "./auth";
import { executeOpenAICompatible } from "@/adapters/openai-compatible";
import { selectActiveCredential } from "@/routing/keyPool";
import { proxyFetch, validateProxyUrl } from "@/routing/proxy";
import { getAntigravityOAuthCredentials } from "./store";
import type { EnvBindings } from "@/types/provider";
import { getUsageSummary } from "@/routing/costTracker";
import { getCircuitStatus } from "@/routing/circuitBreaker";
import { DEFAULT_MODELS_CATALOG } from "@/config/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const adminRouter = new Hono<{ Bindings: EnvBindings; Variables: any }>();

// ---------------------------------------------------------------------------
// Admin auth middleware — AUTH_TOKEN is MANDATORY (fail-closed, no open mode)
// C-1/C-2: Requires master token; virtual keys cannot access admin API.
// ---------------------------------------------------------------------------
adminRouter.use("*", async (c, next) => {
  if (!c.env.AUTH_TOKEN) return serverMisconfigured();
  const token = extractBearer(c);
  const principal = await resolvePrincipal(c, c.env, token);
  if (!principal || principal.kind !== "master") {
    return unauthorized();
  }
  return next();
});

// ---------------------------------------------------------------------------
// GET /config — C-2: API key values masked, never returned in cleartext
// ---------------------------------------------------------------------------
adminRouter.get("/config", async (c) => {
  const cfg = await getAdminConfig(c.env);
  const providers: unknown[] = [];

  for (const [id, staticCfg] of Object.entries(PROVIDER_REGISTRY)) {
    const state = cfg.providerStates[id]?.enabled ?? true;
    const removed = new Set(cfg.removedModels?.[id] || []);
    const customModels = (cfg.customModels[id] || []).filter((m) => !removed.has(m));
    const baseModels = (staticCfg.models || []).filter((m) => !removed.has(m));
    const mergedModels = [...baseModels, ...customModels.filter((m) => !baseModels.includes(m))];
    const finalModels = mergedModels.filter((m) => cfg.modelStates[id + "/" + m]?.enabled !== false);
    const keys = await getCustomProviderKeys(c.env, id);
    providers.push({
      id,
      name: staticCfg.name,
      isBuiltIn: true,
      enabled: state,
      baseUrl: staticCfg.baseUrl || "",
      authType: staticCfg.authType,
      protocol: "openai",
      models: finalModels,
      freeTier: staticCfg.freeTier,
      supportsStreaming: staticCfg.supportsStreaming,
      supportsTools: staticCfg.supportsTools,
      supportsVision: staticCfg.supportsVision,
      keyCount: keys.length,
      keys: keys.map(maskSecret), // C-2
    });
  }

  for (const [id, cp] of Object.entries(cfg.customProviders)) {
    const keys = await getCustomProviderKeys(c.env, id);
    const removed = new Set(cfg.removedModels?.[id] || []);
    const finalModels = (cp.models || []).filter((m) => !removed.has(m) && cfg.modelStates[id + "/" + m]?.enabled !== false);
    providers.push({
      id,
      name: cp.name,
      isBuiltIn: false,
      enabled: true,
      baseUrl: cp.baseUrl,
      authType: cp.protocol === "anthropic" ? "anthropic" : "bearer",
      protocol: cp.protocol,
      models: finalModels,
      freeTier: cp.freeTier,
      supportsStreaming: cp.supportsStreaming,
      supportsTools: cp.supportsTools,
      supportsVision: cp.supportsVision,
      keyCount: keys.length,
      keys: keys.map(maskSecret), // C-2
    });
  }

  return c.json({
    providers,
    providerStates: cfg.providerStates,
    modelStates: cfg.modelStates,
    customModels: cfg.customModels,
    removedModels: cfg.removedModels || {},
    customProviders: Object.fromEntries(
      Object.entries(cfg.customProviders).map(([id, cp]) => [
        id,
        { ...cp, apiKeys: cp.apiKeys.map(maskSecret) }, // C-2
      ])
    ),
  });
});

adminRouter.post("/providers/:id/toggle", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as { enabled?: boolean };
  const enabled = typeof body.enabled === "boolean" ? body.enabled : undefined;
  const cfg = await mutateAdminConfig(c.env, (cfg) => {
    const current = cfg.providerStates[id]?.enabled ?? (PROVIDER_REGISTRY[id] ? true : false);
    cfg.providerStates[id] = { enabled: enabled ?? !current };
  });
  return c.json({ ok: true, id, providerStates: cfg.providerStates });
});

adminRouter.post("/providers", async (c) => {
  const body = (await c.req.json()) as Partial<CustomProvider>;
  const name = body.name?.trim();
  const baseUrl = body.baseUrl?.trim();
  if (!name || !baseUrl) {
    return c.json({ error: { message: "name e baseUrl são obrigatórios", type: "validation" } }, 400);
  }
  const id = body.id?.trim() ? slugifyProviderId(body.id.trim()) : slugifyProviderId(name);
  const apiKeys = (body.apiKeys || []).map((k) => k.trim()).filter(Boolean);
  const cfg = await mutateAdminConfig(c.env, (cfg) => {
    cfg.customProviders[id] = {
      id, name, baseUrl,
      apiKeys,
      protocol: body.protocol || "openai",
      models: body.models || [],
      freeTier: body.freeTier ?? false,
      costPerMillionInput: body.costPerMillionInput ?? 0,
      costPerMillionOutput: body.costPerMillionOutput ?? 0,
      supportsStreaming: body.supportsStreaming ?? true,
      supportsTools: body.supportsTools ?? false,
      supportsVision: body.supportsVision ?? false,
    };
  });
  if (apiKeys.length) await appendProviderKeys(c.env, id, apiKeys);
  return c.json({ ok: true, id, provider: { ...cfg.customProviders[id], apiKeys: apiKeys.map(maskSecret) } });
});

adminRouter.delete("/providers/:id", async (c) => {
  const id = c.req.param("id");
  const existing = (await getAdminConfig(c.env)).customProviders[id];
  if (!existing) return c.json({ error: { message: "Provedor não encontrado", type: "not_found" } }, 404);
  const cfg = await mutateAdminConfig(c.env, (cfg) => { delete cfg.customProviders[id]; });
  await removeProviderKeys(c.env, id, await getCustomProviderKeys(c.env, id));
  return c.json({ ok: true, id, customProviders: cfg.customProviders });
});

adminRouter.post("/providers/:id/keys", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json()) as { keys?: string[]; credentials?: Array<{ apiKey?: string; proxyUrl?: string }> };
  const credentials = (body.credentials || []).map((item) => ({ apiKey: item.apiKey?.trim() || "", proxyUrl: item.proxyUrl?.trim() || undefined }));
  credentials.push(...(body.keys || []).map((apiKey) => ({ apiKey: apiKey.trim(), proxyUrl: undefined })));
  for (const item of credentials) {
    if (item.proxyUrl) {
      try { validateProxyUrl(item.proxyUrl); }
      catch (err) {
        const detail = err instanceof Error ? err.message : "URL de proxy inválida";
        return c.json({ error: { message: detail, type: "validation" } }, 400);
      }
    }
  }
  const merged = await appendProviderCredentials(c.env, id, credentials.filter((item) => item.apiKey));
  return c.json({ ok: true, id, keyCount: merged.length, count: merged.length, keys: merged.map((item) => ({ key: maskSecret(item.apiKey), proxyUrl: item.proxyUrl || "" })) });
});

adminRouter.delete("/providers/:id/keys", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as { keys?: string[] };
  let remaining: string[];
  if (!body.keys || body.keys.length === 0) {
    // Limpar todas as chaves deste provedor
    await setStoredProviderCredentials(c.env, id, []);
    remaining = [];
  } else {
    remaining = await removeProviderKeys(c.env, id, body.keys);
  }
  return c.json({
    ok: true,
    id,
    keyCount: remaining.length,
    count: remaining.length,
    keys: remaining.map(maskSecret),
  });
});

adminRouter.post("/providers/:id/models", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json()) as { model?: string; models?: string[] };
  const modelsToAdd = (body.models && Array.isArray(body.models) ? body.models : [body.model])
    .map((m) => m?.trim())
    .filter((m): m is string => Boolean(m));
  if (modelsToAdd.length === 0) {
    return c.json({ error: { message: "Nome do modelo é obrigatório", type: "validation" } }, 400);
  }
  const cfg = await mutateAdminConfig(c.env, (cfg) => {
    if (!cfg.removedModels) cfg.removedModels = {};
    if (cfg.removedModels[id]) {
      cfg.removedModels[id] = cfg.removedModels[id].filter((m) => !modelsToAdd.includes(m));
    }
    if (cfg.customProviders[id]) {
      const list = cfg.customProviders[id].models;
      for (const model of modelsToAdd) {
        if (!list.includes(model)) list.push(model);
      }
    } else {
      cfg.customModels[id] = Array.from(new Set([...(cfg.customModels[id] || []), ...modelsToAdd]));
    }
    for (const model of modelsToAdd) {
      const mk = id + "/" + model;
      if (cfg.modelStates[mk]) delete cfg.modelStates[mk];
    }
  });
  return c.json({
    ok: true,
    id,
    models: modelsToAdd,
    customModels: cfg.customModels,
    customProviders: cfg.customProviders,
  });
});

adminRouter.post("/providers/:id/fetch-models", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as { apiKey?: string };
  const cfg = await getAdminConfig(c.env);
  const prov = cfg.customProviders[id] || PROVIDER_REGISTRY[id];
  const preset = FREE_PROVIDER_PRESETS.find((p) => p.id === id);

  // Use the same pool entry for its API key and optional proxy URL.
  let apiKey = body.apiKey?.trim() || "";
  let proxyUrl: string | undefined;
  if (!apiKey) {
    const selectedCredential = await selectActiveCredential(c.env, id);
    apiKey = selectedCredential.apiKey;
    proxyUrl = selectedCredential.proxyUrl;
  }

  const baseUrl = prov?.baseUrl || preset?.baseUrl || "";
  const authType = (prov && "authType" in prov ? prov.authType : undefined) || "bearer";
  const headerName: string = (prov && "headerName" in prov && typeof (prov as any).headerName === "string" ? (prov as any).headerName : "api-key");

  let upstreamModels: string[] = [];
  let fetchError: string | null = null;

  // Catálogo nativo Cloudflare Workers AI
  if (id === "cloudflare-ai" || baseUrl === "workers-ai") {
    upstreamModels = [
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      "@cf/meta/llama-3.1-70b-instruct",
      "@cf/meta/llama-3.1-8b-instruct",
      "@cf/meta/llama-3-8b-instruct",
      "@cf/qwen/qwen2.5-coder-32b-instruct",
      "@cf/qwen/qwen2.5-72b-instruct",
      "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
      "@cf/mistral/mistral-7b-instruct-v0.2",
      "@cf/google/gemma-7b-it",
      "@cf/google/gemma-2b-it",
      "@cf/baai/bge-large-en-v1.5",
      "@cf/baai/bge-small-en-v1.5",
    ];
  } else if (baseUrl && !baseUrl.includes("cloudcode-pa.googleapis.com")) {
    // Consulta à API oficial upstream
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      let url = baseUrl.replace(/\/+$/, "") + "/models";
      const headers: Record<string, string> = {
        Accept: "application/json",
      };

      if (id === "gemini") {
        if (apiKey) {
          url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        } else {
          url = ""; // sem chave gemini, cai no catálogo
        }
      } else if (id === "openrouter" || id === "openrouter-free") {
        url = "https://openrouter.ai/api/v1/models";
        if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
      } else if (authType === "apikey-header") {
        headers[headerName] = apiKey || "";
      } else if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      if (url) {
        const res = await proxyFetch(url, { headers, signal: controller.signal }, proxyUrl);
        clearTimeout(timeoutId);

        if (res.ok) {
          const json = (await res.json()) as any;
          const list = Array.isArray(json.data) ? json.data : (Array.isArray(json.models) ? json.models : []);
          let extracted = list
            .map((m: any) => (typeof m === "string" ? m : (m.id || m.name)))
            .filter((m: any): m is string => Boolean(m))
            .map((m: string) => m.replace(/^models\//, ""));

          if (id === "openrouter-free") {
            // Filtra modelos com sufixo :free ou custo zero
            const freeOnly = extracted.filter((m: string) => m.endsWith(":free"));
            extracted = freeOnly.length > 0 ? freeOnly : extracted;
          }
          upstreamModels = extracted;
        } else {
          fetchError = `Upstream HTTP ${res.status}`;
        }
      }
    } catch (err: any) {
      fetchError = err.name === "AbortError" ? "Timeout ao consultar upstream (8s)" : (err.message || String(err));
    }
  }

  // 2. Combinar com catálogo conhecido do provedor e fallbacks ricos
  const registryModels = prov?.models || [];
  const presetModels = preset?.models || [];
  const recommendedModels = preset?.recommendedModels || [];
  const defaultCatModels = DEFAULT_MODELS_CATALOG
    .filter((m) => m.provider === id || (id === "openrouter-free" && m.provider === "openrouter"))
    .map((m) => m.id);
  const activeCustomModels = cfg.customModels[id] || [];

  // Fallbacks específicos para garantir catálogo funcional se upstream estiver sem chave
  const providerFallbacks: Record<string, string[]> = {
    gemini: ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.5-pro", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-pro-exp-02-05"],
    groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "qwen-2.5-coder-32b", "gemma2-9b-it", "mixtral-8x7b-32768", "deepseek-r1-distill-llama-70b"],
    cerebras: ["llama3.3-70b", "llama3.1-8b", "llama3.1-70b"],
    sambanova: ["Meta-Llama-3.3-70B-Instruct", "Qwen2.5-72B-Instruct", "Qwen2.5-Coder-32B-Instruct", "Llama-3.2-11B-Vision-Instruct", "DeepSeek-R1-Distill-Llama-70B"],
    "openrouter-free": ["deepseek/deepseek-r1-0528:free", "deepseek/deepseek-chat-v3-0324:free", "meta-llama/llama-3.3-70b-instruct:free", "google/gemini-2.0-flash-exp:free", "qwen/qwen-2.5-coder-32b-instruct:free"],
    mistral: ["mistral-large-latest", "mistral-small-latest", "codestral-latest", "pixtral-large-latest"],
    alibaba: ["qwen-max", "qwen-plus", "qwen-turbo", "qwen2.5-coder-32b-instruct", "qwen2.5-72b-instruct"],
  };
  const fallbacks = providerFallbacks[id] || [];

  // Combina sem duplicatas
  const allAvailable = Array.from(
    new Set([
      ...upstreamModels,
      ...recommendedModels,
      ...registryModels,
      ...presetModels,
      ...defaultCatModels,
      ...fallbacks,
      ...activeCustomModels,
    ])
  );

  return c.json({
    ok: true,
    id,
    models: allAvailable,
    upstreamCount: upstreamModels.length,
    hasUpstream: upstreamModels.length > 0,
    fetchError,
    activeModels: prov?.models || activeCustomModels,
  });
});

adminRouter.delete("/providers/:id/models", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json()) as { model: string };
  const model = body.model?.trim();
  if (!model) return c.json({ error: { message: "Nome do modelo é obrigatório", type: "validation" } }, 400);
  const cfg = await mutateAdminConfig(c.env, (cfg) => {
    if (!cfg.removedModels) cfg.removedModels = {};
    if (!cfg.removedModels[id]) cfg.removedModels[id] = [];
    if (!cfg.removedModels[id].includes(model)) {
      cfg.removedModels[id].push(model);
    }
    if (cfg.customProviders[id]) {
      cfg.customProviders[id].models = cfg.customProviders[id].models.filter((m) => m !== model);
    }
    if (cfg.customModels[id]) {
      cfg.customModels[id] = (cfg.customModels[id] || []).filter((m) => m !== model);
    }
    cfg.modelStates[id + "/" + model] = { enabled: false };
  });
  return c.json({ ok: true, id, model, removedModels: cfg.removedModels, customModels: cfg.customModels, customProviders: cfg.customProviders });
});

adminRouter.get("/models", async (c) => {
  const q = (c.req.query("q") || "").toLowerCase();
  const cfg = await getAdminConfig(c.env);
  const allModels: Array<{ id: string; provider: string; enabled: boolean }> = [];
  for (const [pid, p] of Object.entries(PROVIDER_REGISTRY)) {
    const enabled = cfg.providerStates[pid]?.enabled ?? true;
    const removed = new Set(cfg.removedModels?.[pid] || []);
    for (const m of p.models || []) {
      if (removed.has(m)) continue;
      allModels.push({ id: m, provider: pid, enabled: enabled && (cfg.modelStates[pid + "/" + m]?.enabled ?? true) });
    }
    for (const m of cfg.customModels[pid] || []) {
      if (removed.has(m)) continue;
      allModels.push({ id: m, provider: pid, enabled: enabled && (cfg.modelStates[pid + "/" + m]?.enabled ?? true) });
    }
  }
  for (const [pid, cp] of Object.entries(cfg.customProviders)) {
    const removed = new Set(cfg.removedModels?.[pid] || []);
    for (const m of cp.models || []) {
      if (removed.has(m)) continue;
      allModels.push({ id: m, provider: pid, enabled: true });
    }
  }
  const filtered = q ? allModels.filter((m) => m.id.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q)) : allModels;
  return c.json({ models: filtered.slice(0, 200), total: filtered.length });
});

adminRouter.post("/models", async (c) => {
  const body = (await c.req.json()) as { provider: string; model: string };
  const model = body.model?.trim();
  const provider = body.provider?.trim();
  if (!model || !provider) return c.json({ error: { message: "provider e model são obrigatórios", type: "validation" } }, 400);
  const cfg = await mutateAdminConfig(c.env, (cfg) => {
    if (!cfg.removedModels) cfg.removedModels = {};
    if (cfg.removedModels[provider]) {
      cfg.removedModels[provider] = cfg.removedModels[provider].filter((m) => m !== model);
    }
    cfg.customModels[provider] = Array.from(new Set([...(cfg.customModels[provider] || []), model]));
    const mk = provider + "/" + model;
    if (cfg.modelStates[mk]) delete cfg.modelStates[mk];
  });
  return c.json({ ok: true, provider, model, customModels: cfg.customModels });
});

// ---------------------------------------------------------------------------
// Free provider presets
// ---------------------------------------------------------------------------
export const FREE_PROVIDER_PRESETS = [
  { id: "gemini", name: "Google Gemini (AI Studio Free)", eloRank: 1, protocol: "openai", baseUrl: "https://generativelanguage.googleapis.com/v1beta", models: ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"], recommendedModels: ["gemini-2.5-flash", "gemini-2.0-flash"], freeTier: true, freeTierNotes: "60M tokens/mes", supportsStreaming: true, supportsTools: true, supportsVision: true },
  { id: "groq", name: "Groq LPU (Ultra-Fast Inference)", eloRank: 2, protocol: "openai", baseUrl: "https://api.groq.com/openai/v1", models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "qwen-2.5-coder-32b", "gemma2-9b-it"], recommendedModels: ["llama-3.3-70b-versatile"], freeTier: true, freeTierNotes: "6.000 reqs/dia", supportsStreaming: true, supportsTools: true, supportsVision: false },
  { id: "cerebras", name: "Cerebras WSE-3", eloRank: 3, protocol: "openai", baseUrl: "https://api.cerebras.ai/v1", models: ["llama3.3-70b", "llama3.1-8b"], recommendedModels: ["llama3.3-70b"], freeTier: true, freeTierNotes: "1M tokens/dia", supportsStreaming: true, supportsTools: true, supportsVision: false },
  { id: "sambanova", name: "SambaNova Systems", eloRank: 4, protocol: "openai", baseUrl: "https://api.sambanova.ai/v1", models: ["Meta-Llama-3.3-70B-Instruct", "Qwen2.5-72B-Instruct"], recommendedModels: ["Meta-Llama-3.3-70B-Instruct"], freeTier: true, freeTierNotes: "LPU gratuito", supportsStreaming: true, supportsTools: true, supportsVision: false },
  { id: "openrouter-free", name: "OpenRouter Free Models", eloRank: 5, protocol: "openai", baseUrl: "https://openrouter.ai/api/v1", models: ["deepseek/deepseek-r1-0528:free", "deepseek/deepseek-chat-v3-0324:free"], recommendedModels: ["deepseek/deepseek-r1-0528:free"], freeTier: true, freeTierNotes: "Modelos gratuitos", supportsStreaming: true, supportsTools: false, supportsVision: false },
  { id: "cloudflare-ai", name: "Cloudflare Workers AI (Native)", eloRank: 6, protocol: "openai", baseUrl: "workers-ai", models: ["@cf/meta/llama-3.3-70b-instruct-fp8-fast", "@cf/meta/llama-3.1-8b-instruct"], recommendedModels: ["@cf/meta/llama-3.3-70b-instruct-fp8-fast"], freeTier: true, freeTierNotes: "10.000 neuronios/dia", supportsStreaming: true, supportsTools: false, supportsVision: false },
];

adminRouter.get("/presets", (c) => c.json({ presets: FREE_PROVIDER_PRESETS }));

// ---------------------------------------------------------------------------
// Search config — C-2: mask stored API keys in GET response
// ---------------------------------------------------------------------------
adminRouter.get("/search", async (c) => {
  const cfg = await getAdminConfig(c.env);
  return c.json({
    ok: true,
    searchConfig: {
      engine: cfg.searchConfig.activeProvider || "auto",
      activeProvider: cfg.searchConfig.activeProvider || "auto",
      searxngUrl: cfg.searchConfig.searxngUrl || "",
      serperApiKey: maskSecret(cfg.searchConfig.serperApiKey), // C-2
      braveApiKey: maskSecret(cfg.searchConfig.braveApiKey),   // C-2
      tavilyApiKey: maskSecret(cfg.searchConfig.tavilyApiKey), // C-2
    },
    envSearx: c.env.SEARXNG_URL || "",
    hasTavilyEnv: !!c.env.TAVILY_API_KEYS,
  });
});

adminRouter.post("/search", async (c) => {
  const body = (await c.req.json()) as Record<string, string>;
  const activeProvider = body.engine || body.activeProvider;
  const cfg = await mutateAdminConfig(c.env, (cfg) => {
    cfg.searchConfig = {
      activeProvider: (activeProvider || cfg.searchConfig.activeProvider || "auto") as "auto" | "searxng" | "duckduckgo" | "tavily" | "serper" | "brave",
      searxngUrl: body.searxngUrl !== undefined ? body.searxngUrl.trim() : cfg.searchConfig.searxngUrl,
      tavilyApiKey: body.tavilyApiKey !== undefined ? body.tavilyApiKey.trim() : cfg.searchConfig.tavilyApiKey,
      serperApiKey: body.serperApiKey !== undefined ? body.serperApiKey.trim() : cfg.searchConfig.serperApiKey,
      braveApiKey: body.braveApiKey !== undefined ? body.braveApiKey.trim() : cfg.searchConfig.braveApiKey,
    };
  });
  return c.json({ ok: true, searchConfig: {
    activeProvider: cfg.searchConfig.activeProvider,
    searxngUrl: cfg.searchConfig.searxngUrl,
    tavilyApiKey: maskSecret(cfg.searchConfig.tavilyApiKey),
    serperApiKey: maskSecret(cfg.searchConfig.serperApiKey),
    braveApiKey: maskSecret(cfg.searchConfig.braveApiKey),
  }});
});

adminRouter.post("/search/test", async (c) => {
  const { dispatchSearch } = await import("@/search/dispatcher");
  const body = (await c.req.json()) as { query: string; provider?: string };
  if (!body.query) return c.json({ error: "query e obrigatorio" }, 400);
  try {
    const results = await dispatchSearch({ query: body.query } as never, c.env);
    return c.json({ ok: true, results });
  } catch (err: unknown) {
    return c.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

// ---------------------------------------------------------------------------
// Virtual keys — C-2: token returned ONCE on creation, masked on GET
// ---------------------------------------------------------------------------
adminRouter.get("/virtual-keys", async (c) => {
  const cfg = await getAdminConfig(c.env);
  return c.json({
    keys: Object.values(cfg.virtualKeys || {}).map((vk) => ({
      id: vk.id,
      name: vk.name,
      keyPreview: maskSecret(vk.id), // C-2: never return full token
      createdAt: vk.createdAt,
      requestsCount: vk.totalRequests || 0,
      lastUsedAt: vk.lastUsedAt,
      allowedModels: vk.allowedModels,
      rpmLimit: vk.rpmLimit,
      enabled: vk.enabled,
    })),
  });
});

adminRouter.post("/virtual-keys", async (c) => {
  const body = (await c.req.json()) as { name?: string; allowedModels?: string[]; rpmLimit?: number };
  const name = body.name?.trim() || "Cliente VeroRoute";
  const keyId = "sk-vr-" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  const allowed = body.allowedModels?.length ? body.allowedModels : ["*"];
  await mutateAdminConfig(c.env, (cfg) => {
    cfg.virtualKeys[keyId] = {
      id: keyId, name,
      createdAt: new Date().toISOString(),
      allowedModels: allowed,
      rpmLimit: body.rpmLimit,
      totalRequests: 0,
      enabled: true,
    };
  });
  // C-2: return full key ONLY at creation time
  return c.json({ ok: true, key: { id: keyId, name, key: keyId, createdAt: new Date().toISOString(), requestsCount: 0, allowedModels: allowed } });
});

adminRouter.patch("/virtual-keys/:id", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json()) as { enabled?: boolean; allowedModels?: string[]; rpmLimit?: number };
  const cfg = await mutateAdminConfig(c.env, (cfg) => {
    const v = cfg.virtualKeys[id];
    if (!v) return;
    if (typeof body.enabled === "boolean") v.enabled = body.enabled;
    if (body.allowedModels) v.allowedModels = body.allowedModels;
    if (body.rpmLimit !== undefined) v.rpmLimit = body.rpmLimit;
  });
  const v = cfg.virtualKeys[id];
  if (!v) return c.json({ error: { message: "Chave nao encontrada", type: "not_found" } }, 404);
  return c.json({ ok: true, key: { id: v.id, name: v.name, keyPreview: maskSecret(v.id), enabled: v.enabled, allowedModels: v.allowedModels } });
});

adminRouter.delete("/virtual-keys/:id", async (c) => {
  const id = c.req.param("id");
  const cfg = await mutateAdminConfig(c.env, (cfg) => { delete cfg.virtualKeys[id]; });
  return c.json({ ok: true, id, count: Object.keys(cfg.virtualKeys).length });
});

// ---------------------------------------------------------------------------
// Combos — A-5: deleteCombo() maintains blacklist for defaults
// ---------------------------------------------------------------------------
adminRouter.get("/combos", async (c) => {
  const cfg = await getAdminConfig(c.env);
  return c.json({ ok: true, combos: Object.values(cfg.combos || {}) });
});

adminRouter.post("/combos", async (c) => {
  const body = (await c.req.json()) as Partial<ComboConfig>;
  const rawId = body.id?.trim() || body.name?.trim();
  if (!rawId) return c.json({ error: { message: "ID/Nome do Combo e obrigatorio", type: "validation" } }, 400);
  const id = slugifyProviderId(rawId);
  const cfg = await mutateAdminConfig(c.env, (cfg) => {
    const existing = cfg.combos[id];
    cfg.combos[id] = {
      id, name: body.name?.trim() || id,
      description: body.description?.trim() || "",
      strategy: body.strategy || "priority",
      targets: Array.isArray(body.targets) ? body.targets : [],
      enabled: body.enabled !== false,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    // If re-creating a deleted default, remove from blacklist
    cfg._deletedDefaultCombos = cfg._deletedDefaultCombos.filter((d) => d !== id);
  });
  return c.json({ ok: true, combo: cfg.combos[id] });
});

adminRouter.delete("/combos/:id", async (c) => {
  const id = c.req.param("id");
  await deleteCombo(c.env, id); // A-5: handles default combo blacklist
  const cfg = await getAdminConfig(c.env);
  return c.json({ ok: true, id, combos: Object.values(cfg.combos) });
});

adminRouter.post("/combos/:id/models", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json()) as { provider: string; model: string; weight?: number; priority?: number };
  if (!body.provider || !body.model) return c.json({ error: { message: "provider e model sao obrigatorios", type: "validation" } }, 400);
  const cfg = await mutateAdminConfig(c.env, (cfg) => {
    if (!cfg.combos[id]) return;
    const already = cfg.combos[id].targets.find((x) => x.provider === body.provider && x.model === body.model);
    if (!already) cfg.combos[id].targets.push({ provider: body.provider, model: body.model, weight: body.weight, priority: body.priority });
    cfg.combos[id].updatedAt = new Date().toISOString();
  });
  return c.json({ ok: true, id, combo: cfg.combos[id] });
});

adminRouter.delete("/combos/:id/models", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json()) as { provider: string; model: string };
  if (!body.provider || !body.model) return c.json({ error: { message: "provider e model sao obrigatorios", type: "validation" } }, 400);
  const cfg = await mutateAdminConfig(c.env, (cfg) => {
    if (cfg.combos[id]) {
      cfg.combos[id].targets = cfg.combos[id].targets.filter(
        (t) => !(t.provider === body.provider && t.model === body.model)
      );
      cfg.combos[id].updatedAt = new Date().toISOString();
    }
  });
  return c.json({ ok: true, id, combo: cfg.combos[id] });
});

// ---------------------------------------------------------------------------
// Combo test — A-7: direct provider call (not cascade), M-10: parallel + timeout
// ---------------------------------------------------------------------------
const COMBO_TEST_TIMEOUT_MS = 12_000;

adminRouter.post("/combos/test", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    comboId?: string;
    targets?: Array<{ provider: string; model: string }>;
  };
  const cfg = await getAdminConfig(c.env);
  let targets: Array<{ provider: string; model: string }>;

  if (body.targets && Array.isArray(body.targets) && body.targets.length > 0) {
    targets = body.targets;
  } else if (body.comboId && cfg.combos[body.comboId]) {
    targets = cfg.combos[body.comboId].targets;
  } else {
    targets = [
      { provider: "gemini", model: "gemini-2.0-flash" },
      { provider: "groq", model: "llama-3.3-70b-versatile" },
      { provider: "cerebras", model: "llama3.3-70b" },
      { provider: "cloudflare-ai", model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast" },
    ];
  }

  // A-7: call provider directly, NOT through cascade (no fallback side effects)
  const testTarget = async (target: { provider: string; model: string }) => {
    const provCfg = getProviderConfig(target.provider);
    if (!provCfg) {
      return { provider: target.provider, model: target.model, status: 404, latency_ms: 0, success: false, error: "Provedor nao encontrado" };
    }
    const credential = await selectActiveCredential(c.env, target.provider);
    const apiKey = credential.apiKey;
    if (!apiKey && target.provider !== "cloudflare-ai") {
      return { provider: target.provider, model: target.model, status: 401, latency_ms: 0, success: false, error: "Sem chave de API" };
    }

    const testReq = {
      model: target.model,
      messages: [{ role: "user" as const, content: "Respond with OK" }],
      max_tokens: 5,
      temperature: 0,
      stream: false,
    };

    const start = Date.now();
    try {
      // M-10: per-target timeout
      const res = await Promise.race([
        executeOpenAICompatible(testReq, target.provider, apiKey, target.model, credential.proxyUrl),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout " + COMBO_TEST_TIMEOUT_MS + "ms")), COMBO_TEST_TIMEOUT_MS)
        ),
      ]);
      const latency = Date.now() - start;
      if (res.ok) {
        let text = "OK";
        try {
          const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
          text = j.choices?.[0]?.message?.content?.trim().slice(0, 30) || "OK";
        } catch { /* stream */ }
        return { provider: target.provider, model: target.model, status: res.status, latency_ms: latency, success: true, output: text };
      }
      const errText = (await res.text()).slice(0, 150);
      return { provider: target.provider, model: target.model, status: res.status, latency_ms: latency, success: false, error: errText };
    } catch (err: unknown) {
      return { provider: target.provider, model: target.model, status: 500, latency_ms: Date.now() - start, success: false, error: err instanceof Error ? err.message : String(err) };
    }
  };

  // M-10: all in parallel
  const results = await Promise.all(targets.map(testTarget));
  return c.json({ ok: true, results });
});

// ---------------------------------------------------------------------------
// Antigravity OAuth config — C-2: credentials masked
// ---------------------------------------------------------------------------
adminRouter.get("/antigravity/status", async (c) => {
  const { clientId, isConfigured } = await getAntigravityOAuthCredentials(c.env);
  let hasTokens = false;
  if (c.env.OMNI_KEYS) {
    hasTokens = Boolean(await c.env.OMNI_KEYS.get("antigravity_tokens"));
  }
  return c.json({ ok: true, isConfigured, hasClientId: Boolean(clientId), maskedClientId: maskSecret(clientId), hasTokens });
});

adminRouter.post("/antigravity/config", async (c) => {
  const body = (await c.req.json()) as { clientId: string; clientSecret: string };
  const clientId = body.clientId?.trim();
  const clientSecret = body.clientSecret?.trim();
  if (!clientId || !clientSecret) {
    return c.json({ error: { message: "Client ID e Client Secret sao obrigatorios", type: "validation" } }, 400);
  }
  const cfg = await mutateAdminConfig(c.env, (cfg) => {
    cfg.antigravityConfig = { clientId, clientSecret, updatedAt: new Date().toISOString() };
  });
  return c.json({ ok: true, message: "Credenciais salvas no KV OMNI_KEYS.", configuredAt: cfg.antigravityConfig?.updatedAt });
});

export default adminRouter;

// Phase C: usage stats
adminRouter.get("/usage/:keyId", async (c) => {
  const keyId = c.req.param("keyId");
  const usage = await getUsageSummary(c.env, keyId);
  return c.json({ keyId, ...usage });
});

// Phase C: circuit breaker status
adminRouter.get("/circuits", async (c) => {
  const providers = ["openai", "gemini", "groq", "cerebras", "cloudflare-ai", "1min", "openrouter", "deepseek", "mistral", "sambanova", "pollinations"];
  const results = await Promise.all(providers.map(async (p) => ({ provider: p, ...(await getCircuitStatus(c.env, p)) })));
  return c.json({ circuits: results });
});
