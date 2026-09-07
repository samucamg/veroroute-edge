import { Hono } from "hono";
import { PROVIDER_REGISTRY } from "@/config/providers";
import {
  getAdminConfig,
  mutateAdminConfig,
  slugifyProviderId,
  appendProviderKeys,
  removeProviderKeys,
  getCustomProviderKeys,
  type CustomProvider,
  type ComboConfig,
  type ComboTarget,
} from "./store";
import type { EnvBindings } from "@/types/provider";

export const adminRouter = new Hono<{ Bindings: EnvBindings }>();

function unauthorized() {
  return new Response(
    JSON.stringify({ error: { message: "Não autorizado (admin)", type: "admin_auth_failed" } }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}

adminRouter.use("*", async (c, next) => {
  const authToken = c.env.AUTH_TOKEN;
  if (authToken) {
    const authHeader = c.req.header("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token !== authToken) {
      return unauthorized();
    }
  }
  await next();
});

adminRouter.get("/config", async (c) => {
  const cfg = await getAdminConfig(c.env);
  const providers: any[] = [];

  for (const [id, staticCfg] of Object.entries(PROVIDER_REGISTRY)) {
    const state = cfg.providerStates[id]?.enabled ?? true;
    const customModels = cfg.customModels[id] || [];
    const keys = await getCustomProviderKeys(c.env, id);
    providers.push({
      id,
      name: staticCfg.name,
      isBuiltIn: true,
      enabled: state,
      baseUrl: staticCfg.baseUrl || "",
      authType: staticCfg.authType,
      protocol: "openai",
      models: [...(staticCfg.models || []), ...customModels.filter((m) => !staticCfg.models.includes(m))],
      freeTier: staticCfg.freeTier,
      supportsStreaming: staticCfg.supportsStreaming,
      supportsTools: staticCfg.supportsTools,
      supportsVision: staticCfg.supportsVision,
      keyCount: keys.length,
      keys: keys,
    });
  }

  for (const [id, cp] of Object.entries(cfg.customProviders)) {
    const keys = await getCustomProviderKeys(c.env, id);
    providers.push({
      id,
      name: cp.name,
      isBuiltIn: false,
      enabled: true,
      baseUrl: cp.baseUrl,
      authType: cp.protocol === "anthropic" ? "anthropic" : "bearer",
      protocol: cp.protocol,
      models: cp.models,
      freeTier: cp.freeTier,
      supportsStreaming: cp.supportsStreaming,
      supportsTools: cp.supportsTools,
      supportsVision: cp.supportsVision,
      keyCount: keys.length,
      keys: keys,
    });
  }

  return c.json({
    providers,
    providerStates: cfg.providerStates,
    modelStates: cfg.modelStates,
    customModels: cfg.customModels,
    customProviders: cfg.customProviders,
    registry: PROVIDER_REGISTRY,
  });
});

adminRouter.post("/providers/:id/toggle", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as { enabled?: boolean };
  const enabled = typeof body.enabled === "boolean" ? body.enabled : undefined;

  const cfg = await mutateAdminConfig(c.env, (cfg) => {
    const current = cfg.providerStates[id]?.enabled ?? (PROVIDER_REGISTRY[id] ? true : false);
    const next = enabled ?? !current;
    cfg.providerStates[id] = { enabled: next };
  });

  return c.json({ ok: true, id, providerStates: cfg.providerStates });
});

adminRouter.post("/providers", async (c) => {
  const body = (await c.req.json()) as Partial<CustomProvider>;
  const name = body.name?.trim();
  const baseUrl = body.baseUrl?.trim();
  const protocol = body.protocol === "anthropic" ? "anthropic" : "openai";

  if (!name) {
    return c.json({ error: { message: "O nome do provedor é obrigatório", type: "validation" } }, 400);
  }
  if (!baseUrl) {
    return c.json({ error: { message: "A baseUrl do provedor é obrigatória", type: "validation" } }, 400);
  }

  const id = slugifyProviderId(body.id || name);
  const models = (body.models || []).map((m) => m.trim()).filter(Boolean);

  const cfg = await mutateAdminConfig(c.env, (cfg) => {
    cfg.customProviders[id] = {
      id,
      name,
      baseUrl,
      apiKeys: body.apiKeys || [],
      protocol,
      models,
      freeTier: body.freeTier ?? true,
      costPerMillionInput: body.costPerMillionInput ?? 0,
      costPerMillionOutput: body.costPerMillionOutput ?? 0,
      supportsStreaming: body.supportsStreaming ?? true,
      supportsTools: body.supportsTools ?? true,
      supportsVision: body.supportsVision ?? false,
    };
  });

  if (body.apiKeys?.length) {
    await appendProviderKeys(c.env, id, body.apiKeys);
  }

  return c.json({ ok: true, id, provider: cfg.customProviders[id] });
});

adminRouter.delete("/providers/:id", async (c) => {
  const id = c.req.param("id");
  const exists = (await getAdminConfig(c.env)).customProviders[id];
  if (!exists) {
    return c.json({ error: { message: "Provedor não encontrado", type: "not_found" } }, 404);
  }
  const cfg = await mutateAdminConfig(c.env, (cfg) => {
    delete cfg.customProviders[id];
  });
  await removeProviderKeys(c.env, id, await getCustomProviderKeys(c.env, id));
  return c.json({ ok: true, id, customProviders: cfg.customProviders });
});

adminRouter.post("/providers/:id/keys", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json()) as { keys: string[] };
  const newKeys = (body.keys || []).map((k) => k.trim()).filter(Boolean);
  const merged = await appendProviderKeys(c.env, id, newKeys);
  return c.json({ ok: true, id, keys: merged });
});

adminRouter.delete("/providers/:id/keys", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json()) as { keys: string[] };
  const remaining = await removeProviderKeys(c.env, id, body.keys || []);
  return c.json({ ok: true, id, keys: remaining });
});

adminRouter.post("/providers/:id/models", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json()) as { model: string };
  const model = body.model?.trim();
  if (!model) {
    return c.json({ error: { message: "Nome do modelo é obrigatório", type: "validation" } }, 400);
  }

  const cfg = await mutateAdminConfig(c.env, (cfg) => {
    if (cfg.customProviders[id]) {
      const list = cfg.customProviders[id].models;
      if (!list.includes(model)) list.push(model);
    } else {
      cfg.customModels[id] = Array.from(new Set([...(cfg.customModels[id] || []), model]));
    }
    const modelKey = id + "/" + model;
    if (cfg.modelStates[modelKey]) {
      delete cfg.modelStates[modelKey];
    }
  });

  return c.json({ ok: true, id, model, customModels: cfg.customModels, customProviders: cfg.customProviders });
});

adminRouter.delete("/providers/:id/models", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json()) as { model: string };
  const model = body.model?.trim();
  if (!model) {
    return c.json({ error: { message: "Nome do modelo é obrigatório", type: "validation" } }, 400);
  }

  const cfg = await mutateAdminConfig(c.env, (cfg) => {
    if (cfg.customProviders[id]) {
      cfg.customProviders[id].models = cfg.customProviders[id].models.filter((m) => m !== model);
    } else {
      cfg.customModels[id] = (cfg.customModels[id] || []).filter((m) => m !== model);
    }
    const modelKey = id + "/" + model;
    cfg.modelStates[modelKey] = { enabled: false };
  });

  return c.json({ ok: true, id, model, customModels: cfg.customModels, customProviders: cfg.customProviders });
});

adminRouter.get("/models", async (c) => {
  const q = (c.req.query("q") || "").toLowerCase();
  const cfg = await getAdminConfig(c.env);
  const allModels: Array<{ id: string; provider: string; enabled: boolean }> = [];

  for (const [providerId, p] of Object.entries(PROVIDER_REGISTRY)) {
    const enabledState = cfg.providerStates[providerId]?.enabled ?? true;
    for (const m of p.models || []) {
      const modelKey = providerId + "/" + m;
      const enabled = enabledState && (cfg.modelStates[modelKey]?.enabled ?? true);
      allModels.push({ id: m, provider: providerId, enabled });
    }
    for (const m of cfg.customModels[providerId] || []) {
      const modelKey = providerId + "/" + m;
      const enabled = enabledState && (cfg.modelStates[modelKey]?.enabled ?? true);
      allModels.push({ id: m, provider: providerId, enabled });
    }
  }

  for (const [providerId, cp] of Object.entries(cfg.customProviders)) {
    for (const m of cp.models || []) {
      allModels.push({ id: m, provider: providerId, enabled: true });
    }
  }

  const filtered = q ? allModels.filter((m) => m.id.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q)) : allModels;
  return c.json({ models: filtered.slice(0, 200), total: filtered.length });
});

adminRouter.post("/models", async (c) => {
  const body = (await c.req.json()) as { provider: string; model: string };
  const model = body.model?.trim();
  const provider = body.provider?.trim();
  if (!model || !provider) {
    return c.json({ error: { message: "provider e model são obrigatórios", type: "validation" } }, 400);
  }
  const cfg = await mutateAdminConfig(c.env, (cfg) => {
    cfg.customModels[provider] = Array.from(new Set([...(cfg.customModels[provider] || []), model]));
    const modelKey = provider + "/" + model;
    if (cfg.modelStates[modelKey]) delete cfg.modelStates[modelKey];
  });
  return c.json({ ok: true, provider, model, customModels: cfg.customModels });
});

// ==========================================
// PRESETS DE PROVEDORES GRATUITOS (ELO ARENA)
// ==========================================
export const FREE_PROVIDER_PRESETS = [
  {
    id: "gemini",
    name: "Google Gemini (AI Studio Free)",
    eloRank: 1,
    protocol: "openai",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    models: ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"],
    recommendedModels: ["gemini-2.5-flash", "gemini-2.0-flash"],
    freeTier: true,
    freeTierNotes: "60M tokens/mês · 1.500 req/dia grátis",
    costPerMillionInput: 0,
    costPerMillionOutput: 0,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    description: "1.500 req/dia e 1M tokens/minuto gratuitos.",
  },
  {
    id: "groq",
    name: "Groq Cloud (Free Tier)",
    eloRank: 2,
    protocol: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
    recommendedModels: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
    freeTier: true,
    freeTierNotes: "14.400 req/dia · 30 RPM · 500+ t/s",
    costPerMillionInput: 0,
    costPerMillionOutput: 0,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
    description: "14.400 req/dia gratuitas (30 RPM). Ultra-rápido.",
  },
  {
    id: "cerebras",
    name: "Cerebras Inference",
    eloRank: 3,
    protocol: "openai",
    baseUrl: "https://api.cerebras.ai/v1",
    models: ["llama3.3-70b", "llama3.1-8b"],
    recommendedModels: ["llama3.3-70b", "llama3.1-8b"],
    freeTier: true,
    freeTierNotes: "1M tokens/dia · 2.000 t/s gratuitos",
    costPerMillionInput: 0,
    costPerMillionOutput: 0,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
    description: "2.000 tokens/s e 1 milhão de tokens diários gratuitos.",
  },
  {
    id: "alibaba",
    name: "Alibaba DashScope (Qwen)",
    eloRank: 4,
    protocol: "openai",
    baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    models: ["qwen-max", "qwen-plus", "qwen2.5-coder-32b-instruct"],
    recommendedModels: ["qwen-max", "qwen2.5-coder-32b-instruct"],
    freeTier: true,
    freeTierNotes: "1M tokens grátis · Qwen 2.5 Coder",
    costPerMillionInput: 0,
    costPerMillionOutput: 0,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    description: "Tier gratuito generoso com modelos especialistas em código.",
  },
  {
    id: "sambanova",
    name: "SambaNova Systems",
    eloRank: 5,
    protocol: "openai",
    baseUrl: "https://api.sambanova.ai/v1",
    models: ["Meta-Llama-3.3-70B-Instruct", "Qwen2.5-72B-Instruct"],
    recommendedModels: ["Meta-Llama-3.3-70B-Instruct", "Qwen2.5-72B-Instruct"],
    freeTier: true,
    freeTierNotes: "LPU dedicada · Llama 70B + Qwen 72B grátis",
    costPerMillionInput: 0,
    costPerMillionOutput: 0,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
    description: "Incrível velocidade de inferência para Llama 70B e Qwen 72B.",
  },
  {
    id: "openrouter-free",
    name: "OpenRouter Free Models",
    eloRank: 6,
    protocol: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    models: ["meta-llama/llama-3.3-70b-instruct:free", "deepseek/deepseek-r1:free", "google/gemini-2.0-flash-exp:free"],
    recommendedModels: ["meta-llama/llama-3.3-70b-instruct:free", "deepseek/deepseek-r1:free"],
    freeTier: true,
    freeTierNotes: "Modelos :free sem custo · DeepSeek R1 grátis",
    costPerMillionInput: 0,
    costPerMillionOutput: 0,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    description: "Acesso aos endpoints :free de DeepSeek R1 e Llama 3.3.",
  },
  {
    id: "pollinations",
    name: "Pollinations.ai (Keyless)",
    eloRank: 7,
    protocol: "openai",
    baseUrl: "https://text.pollinations.ai/openai",
    models: ["openai", "mistral", "claude", "karma"],
    recommendedModels: ["openai", "mistral"],
    freeTier: true,
    freeTierNotes: "100% keyless · Sem limites de cadastro",
    costPerMillionInput: 0,
    costPerMillionOutput: 0,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
    description: "100% gratuito e sem necessidade de chave de API.",
  },
];

adminRouter.get("/presets", (c) => {
  return c.json({ presets: FREE_PROVIDER_PRESETS });
});

// ==========================================
// CONFIGURAÇÃO DINÂMICA DE BUSCA & RAG NO KV
// ==========================================
adminRouter.get("/search", async (c) => {
  const cfg = await getAdminConfig(c.env);
  return c.json({
    ok: true,
    searchConfig: {
      engine: cfg.searchConfig.activeProvider || "auto",
      activeProvider: cfg.searchConfig.activeProvider || "auto",
      searxngUrl: cfg.searchConfig.searxngUrl || "",
      serperApiKey: cfg.searchConfig.serperApiKey || "",
      braveApiKey: cfg.searchConfig.braveApiKey || "",
      tavilyApiKey: cfg.searchConfig.tavilyApiKey || "",
    },
    envSearx: c.env.SEARXNG_URL || "",
    hasTavilyEnv: !!c.env.TAVILY_API_KEYS,
  });
});

adminRouter.post("/search", async (c) => {
  const body = (await c.req.json()) as any;
  // Support both 'engine' (frontend field name) and 'activeProvider' (backend field name)
  const activeProvider = body.engine || body.activeProvider;
  const cfg = await mutateAdminConfig(c.env, (cfg) => {
    cfg.searchConfig = {
      activeProvider: activeProvider || cfg.searchConfig.activeProvider || "auto",
      searxngUrl: body.searxngUrl !== undefined ? body.searxngUrl.trim() : cfg.searchConfig.searxngUrl,
      tavilyApiKey: body.tavilyApiKey !== undefined ? body.tavilyApiKey.trim() : cfg.searchConfig.tavilyApiKey,
      serperApiKey: body.serperApiKey !== undefined ? body.serperApiKey.trim() : cfg.searchConfig.serperApiKey,
      braveApiKey: body.braveApiKey !== undefined ? body.braveApiKey.trim() : cfg.searchConfig.braveApiKey,
    };
  });
  return c.json({ ok: true, searchConfig: cfg.searchConfig });
});

adminRouter.post("/search/test", async (c) => {
  const body = (await c.req.json()) as { query?: string; provider?: string };
  const q = body.query?.trim() || "últimas novidades em inteligência artificial";
  try {
    const { dispatchSearch } = await import("@/search/dispatcher");
    const res = await dispatchSearch({ query: q, limit: 3, provider: body.provider as any }, c.env);
    // Flatten the result for the frontend: { ok, engine, results: [...] }
    return c.json({
      ok: true,
      engine: res.provider || "auto",
      results: (res.results || []).map((r: any) => ({
        title: r.title || "",
        url: r.url || "",
        snippet: r.content || r.snippet || "",
      })),
      took_ms: res.took_ms || 0,
    });
  } catch (err: any) {
    return c.json({ ok: false, error: err.message }, 500);
  }
});

// ==========================================
// GESTÃO DE CHAVES VIRTUAIS (API MANAGER LIGHT)
// ==========================================
adminRouter.get("/virtual-keys", async (c) => {
  const cfg = await getAdminConfig(c.env);
  const keysArr = Object.values(cfg.virtualKeys || {}).map((vk: any) => ({
    id: vk.id,
    name: vk.name,
    key: vk.id, // The key IS the id (sk-vr-...)
    createdAt: vk.createdAt,
    requestsCount: vk.totalRequests || 0,
    enabled: vk.enabled,
  }));
  return c.json({ keys: keysArr });
});

adminRouter.post("/virtual-keys", async (c) => {
  const body = (await c.req.json()) as { name: string; allowedModels?: string[] };
  const name = body.name?.trim() || "Cliente VeroRoute";
  const keyId = "sk-vr-" + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  const allowed = body.allowedModels?.length ? body.allowedModels : ["*"];

  const cfg = await mutateAdminConfig(c.env, (cfg) => {
    cfg.virtualKeys[keyId] = {
      id: keyId,
      name,
      createdAt: new Date().toISOString(),
      allowedModels: allowed,
      totalRequests: 0,
      enabled: true,
    };
  });

  const vk = cfg.virtualKeys[keyId];
  return c.json({ ok: true, key: { id: vk.id, name: vk.name, key: vk.id, createdAt: vk.createdAt, requestsCount: 0 } });
});

adminRouter.delete("/virtual-keys/:id", async (c) => {
  const id = c.req.param("id");
  const cfg = await mutateAdminConfig(c.env, (cfg) => {
    delete cfg.virtualKeys[id];
  });
  return c.json({ ok: true, id, virtualKeys: Object.values(cfg.virtualKeys) });
});

// ==========================================
// COMBOS & QUOTAS (COMBO STUDIO LIGHT)
// ==========================================
adminRouter.get("/combos", async (c) => {
  const cfg = await getAdminConfig(c.env);
  const combos = Object.values(cfg.combos || {});
  return c.json({ ok: true, combos });
});

adminRouter.post("/combos", async (c) => {
  const body = (await c.req.json()) as Partial<ComboConfig>;
  const rawId = body.id?.trim() || body.name?.trim();
  if (!rawId) {
    return c.json({ error: { message: "ID/Nome do Combo é obrigatório", type: "validation" } }, 400);
  }

  const id = slugifyProviderId(rawId);
  const name = body.name?.trim() || id;
  const description = body.description?.trim() || "";
  const strategy = body.strategy || "priority";
  const targets = Array.isArray(body.targets) ? body.targets : [];

  const cfg = await mutateAdminConfig(c.env, (cfg) => {
    const existing = cfg.combos[id];
    cfg.combos[id] = {
      id,
      name,
      description,
      strategy,
      targets,
      enabled: body.enabled !== false,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  return c.json({ ok: true, combo: cfg.combos[id] });
});

adminRouter.delete("/combos/:id", async (c) => {
  const id = c.req.param("id");
  const cfg = await mutateAdminConfig(c.env, (cfg) => {
    delete cfg.combos[id];
  });
  return c.json({ ok: true, id, combos: Object.values(cfg.combos) });
});

adminRouter.post("/combos/:id/models", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json()) as { provider: string; model: string; weight?: number; priority?: number };
  if (!body.provider || !body.model) {
    return c.json({ error: { message: "provider e model são obrigatórios", type: "validation" } }, 400);
  }

  const cfg = await mutateAdminConfig(c.env, (cfg) => {
    if (!cfg.combos[id]) {
      cfg.combos[id] = {
        id,
        name: id,
        description: "",
        strategy: "priority",
        targets: [],
        enabled: true,
        createdAt: new Date().toISOString(),
      };
    }
    const exists = cfg.combos[id].targets.some(
      (t) => t.provider === body.provider && t.model === body.model
    );
    if (!exists) {
      cfg.combos[id].targets.push({
        provider: body.provider,
        model: body.model,
        weight: body.weight,
        priority: body.priority,
      });
      cfg.combos[id].updatedAt = new Date().toISOString();
    }
  });

  return c.json({ ok: true, id, combo: cfg.combos[id] });
});

adminRouter.delete("/combos/:id/models", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json()) as { provider: string; model: string };
  if (!body.provider || !body.model) {
    return c.json({ error: { message: "provider e model são obrigatórios", type: "validation" } }, 400);
  }

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

adminRouter.post("/combos/test", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    comboId?: string;
    targets?: Array<{ provider: string; model: string }>;
  };

  const cfg = await getAdminConfig(c.env);
  let targetsToTest: Array<{ provider: string; model: string }> = [];

  if (body.targets && Array.isArray(body.targets) && body.targets.length > 0) {
    targetsToTest = body.targets;
  } else if (body.comboId && cfg.combos[body.comboId]) {
    targetsToTest = cfg.combos[body.comboId].targets;
  } else {
    targetsToTest = [
      { provider: "gemini", model: "gemini-2.5-flash" },
      { provider: "groq", model: "llama-3.3-70b-versatile" },
      { provider: "cerebras", model: "llama3.3-70b" },
      { provider: "cloudflare-ai", model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast" },
    ];
  }

  const { dispatchWithCascade } = await import("@/routing/cascade");

  const results: Array<{
    provider: string;
    model: string;
    status: number;
    latency_ms: number;
    success: boolean;
    error?: string;
    output?: string;
  }> = [];

  for (const target of targetsToTest) {
    const start = Date.now();
    try {
      const testReq = {
        model: `${target.provider}/${target.model}`,
        messages: [{ role: "user" as const, content: "Respond strictly with 'OK'" }],
        max_tokens: 5,
        temperature: 0,
      };

      const res = await dispatchWithCascade(testReq as any, c.env);
      const latency = Date.now() - start;

      if (res.ok) {
        let text = "";
        try {
          const json = (await res.json()) as any;
          text = json.choices?.[0]?.message?.content || "OK";
        } catch {
          text = "OK";
        }
        results.push({
          provider: target.provider,
          model: target.model,
          status: res.status,
          latency_ms: latency,
          success: true,
          output: text.trim().slice(0, 30),
        });
      } else {
        const errText = await res.text();
        results.push({
          provider: target.provider,
          model: target.model,
          status: res.status,
          latency_ms: latency,
          success: false,
          error: errText.slice(0, 150),
        });
      }
    } catch (err: any) {
      results.push({
        provider: target.provider,
        model: target.model,
        status: 500,
        latency_ms: Date.now() - start,
        success: false,
        error: err.message,
      });
    }
  }

  return c.json({ ok: true, results });
});

// ==========================================
// CONFIGURAÇÃO OAUTH DO ANTIGRAVITY NO KV
// ==========================================
adminRouter.get("/antigravity/status", async (c) => {
  const { getAntigravityOAuthCredentials } = await import("./store");
  const { clientId, isConfigured } = await getAntigravityOAuthCredentials(c.env);
  let hasTokens = false;
  if (c.env.OMNI_KEYS) {
    const saved = await c.env.OMNI_KEYS.get("antigravity_tokens");
    hasTokens = Boolean(saved);
  }
  return c.json({
    ok: true,
    isConfigured,
    hasClientId: Boolean(clientId),
    maskedClientId: clientId ? clientId.slice(0, 8) + "..." + clientId.slice(-6) : "",
    hasTokens,
  });
});

adminRouter.post("/antigravity/config", async (c) => {
  const body = (await c.req.json()) as { clientId: string; clientSecret: string };
  const clientId = body.clientId?.trim();
  const clientSecret = body.clientSecret?.trim();

  if (!clientId || !clientSecret) {
    return c.json({ error: { message: "Client ID e Client Secret são obrigatórios", type: "validation" } }, 400);
  }

  const cfg = await mutateAdminConfig(c.env, (cfg) => {
    cfg.antigravityConfig = {
      clientId,
      clientSecret,
      updatedAt: new Date().toISOString(),
    };
  });

  return c.json({
    ok: true,
    message: "Credenciais do Antigravity salvas no KV OMNI_KEYS com sucesso.",
    configuredAt: cfg.antigravityConfig?.updatedAt,
  });
});

export default adminRouter;