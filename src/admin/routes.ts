import { Hono } from "hono";
import { PROVIDER_REGISTRY, getProviderConfig } from "@/config/providers";
import {
  getAdminConfig,
  mutateAdminConfig,
  deleteCombo,
  slugifyProviderId,
  appendProviderKeys,
  appendProviderCredentials,
  getStoredProviderCredentials,
  setStoredProviderCredentials,
  removeProviderKeys,
  getCustomProviderKeys,
  setProviderBaseUrl,
  type CustomProvider,
  type ComboConfig,
} from "./store";
import { extractBearer, resolvePrincipal, unauthorized, maskSecret } from "./auth";
import { executeOpenAICompatible } from "@/adapters/openai-compatible";
import { executeCloudflareAI } from "@/adapters/cloudflare-ai";
import type { ChatCompletionRequest } from "@/types/openai";
import { getProviderCredentials, markKeyRateLimited, selectActiveCredential } from "@/routing/keyPool";
import { getAntigravityOAuthCredentials } from "./store";
import type { EnvBindings } from "@/types/provider";
import { getUsageSummary } from "@/routing/costTracker";
import { getCircuitStatus } from "@/routing/circuitBreaker";
import { getStaticCatalog } from "@/config/modelRegistry";
import {
  isOpenAICompatBaseUrl,
  normalizeProviderId,
  resolveGeminiSurface,
  stripTrailingSlashes,
} from "@/config/providerAliases";
import {
  discoverModels,
  fetchAntigravityAvailableModels,
  fetchGeminiOpenAICompatModels,
  GEMINI_NATIVE_BASE_URL,
  GEMINI_OPENAI_COMPAT_BASE_URL,
} from "./modelDiscovery";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const adminRouter = new Hono<{ Bindings: EnvBindings; Variables: any }>();

// ---------------------------------------------------------------------------
// Admin auth middleware — AUTH_TOKEN is MANDATORY (fail-closed, no open mode)
// C-1/C-2: Requires master token; virtual keys cannot access admin API.
// ---------------------------------------------------------------------------
adminRouter.use("*", async (c, next) => {
  const token = extractBearer(c);
  const principal = await resolvePrincipal(c, token);
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

  const builtInPromises = Object.entries(PROVIDER_REGISTRY).map(async ([id, staticCfg]) => {
    const state = cfg.providerStates[id]?.enabled ?? true;
    const removed = new Set(cfg.removedModels?.[id] || []);
    const customModels = (cfg.customModels[id] || []).filter((m) => !removed.has(m));
    const baseModels = (staticCfg.models || []).filter((m) => !removed.has(m));
    const mergedModels = [...baseModels, ...customModels.filter((m) => !baseModels.includes(m))];
    const finalModels = mergedModels.filter((m) => cfg.modelStates[id + "/" + m]?.enabled !== false);
    const keys = await getCustomProviderKeys(c.env, id);
    const customBaseUrl = cfg.providerBaseUrls?.[id] || (id === "azure" ? c.env.AZURE_OPENAI_ENDPOINT : undefined);
    const effectiveBaseUrl = customBaseUrl || staticCfg.baseUrl || "";
    return {
      id,
      name: staticCfg.name,
      isBuiltIn: true,
      enabled: state,
      baseUrl: effectiveBaseUrl,
      defaultBaseUrl: staticCfg.baseUrl || "",
      hasCustomEndpoint: Boolean(customBaseUrl),
      authType: staticCfg.authType,
      protocol: "openai",
      models: finalModels,
      freeTier: staticCfg.freeTier,
      supportsStreaming: staticCfg.supportsStreaming,
      supportsTools: staticCfg.supportsTools,
      supportsVision: staticCfg.supportsVision,
      keyCount: keys.length,
      keys: keys.map(maskSecret), // C-2
    };
  });

  const customPromises = Object.entries(cfg.customProviders).map(async ([id, cp]) => {
    const keys = await getCustomProviderKeys(c.env, id);
    const removed = new Set(cfg.removedModels?.[id] || []);
    const finalModels = (cp.models || []).filter((m) => !removed.has(m) && cfg.modelStates[id + "/" + m]?.enabled !== false);
    const customBaseUrl = cfg.providerBaseUrls?.[id];
    return {
      id,
      name: cp.name,
      isBuiltIn: false,
      enabled: true,
      baseUrl: customBaseUrl || cp.baseUrl,
      defaultBaseUrl: cp.baseUrl,
      hasCustomEndpoint: Boolean(customBaseUrl),
      authType: cp.protocol === "anthropic" ? "anthropic" : "bearer",
      protocol: cp.protocol,
      models: finalModels,
      freeTier: cp.freeTier,
      supportsStreaming: cp.supportsStreaming,
      supportsTools: cp.supportsTools,
      supportsVision: cp.supportsVision,
      keyCount: keys.length,
      keys: keys.map(maskSecret), // C-2
    };
  });

  const [builtInProviders, customProvidersList] = await Promise.all([
    Promise.all(builtInPromises),
    Promise.all(customPromises),
  ]);

  const providers = [...builtInProviders, ...customProvidersList];

  return c.json({
    providers,
    hasKV: Boolean(c.env.OMNI_KEYS),
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
  const id = normalizeProviderId(c.req.param("id"));
  const body = (await c.req.json().catch(() => ({}))) as { enabled?: boolean };
  const enabled = typeof body.enabled === "boolean" ? body.enabled : undefined;
  const cfg = await mutateAdminConfig(c.env, (cfg) => {
    const current = cfg.providerStates[id]?.enabled ?? (PROVIDER_REGISTRY[id] ? true : false);
    cfg.providerStates[id] = { enabled: enabled ?? !current };
  });
  return c.json({ ok: true, id, providerStates: cfg.providerStates });
});

adminRouter.post("/providers/:id/endpoint", async (c) => {
  const id = normalizeProviderId(c.req.param("id"));
  const body = (await c.req.json().catch(() => ({}))) as { baseUrl?: string };
  const rawUrl = (body.baseUrl || "").trim();
  const cfg = await setProviderBaseUrl(c.env, id, rawUrl);
  const staticCfg = PROVIDER_REGISTRY[id];
  const effectiveBaseUrl = cfg.providerBaseUrls?.[id] || (id === "azure" ? c.env.AZURE_OPENAI_ENDPOINT : undefined) || staticCfg?.baseUrl || "";
  return c.json({
    ok: true,
    id,
    baseUrl: effectiveBaseUrl,
    hasCustomEndpoint: Boolean(cfg.providerBaseUrls?.[id]),
  });
});

adminRouter.delete("/providers/:id/endpoint", async (c) => {
  const id = normalizeProviderId(c.req.param("id"));
  const cfg = await setProviderBaseUrl(c.env, id, undefined);
  const staticCfg = PROVIDER_REGISTRY[id];
  return c.json({
    ok: true,
    id,
    baseUrl: staticCfg?.baseUrl || "",
    hasCustomEndpoint: false,
  });
});

adminRouter.post("/providers", async (c) => {
  const body = (await c.req.json()) as Partial<CustomProvider>;
  const name = body.name?.trim();
  const baseUrl = body.baseUrl?.trim();
  if (!name || !baseUrl) {
    return c.json({ error: { message: "name e baseUrl são obrigatórios", type: "validation" } }, 400);
  }
  const rawId = body.id?.trim() ? slugifyProviderId(body.id.trim()) : slugifyProviderId(name);
  const id = normalizeProviderId(rawId);
  const apiKeys = (body.apiKeys || []).map((k) => k.trim()).filter(Boolean);

  // Falha 5 FIX: se o ID já é um provedor nativo, mesclar sem duplicar em customProviders
  if (PROVIDER_REGISTRY[id]) {
    if (apiKeys.length) {
      await appendProviderKeys(c.env, id, apiKeys);
    }
    const cfg = await mutateAdminConfig(c.env, (cfg) => {
      // Se body trouxe novos modelos, mesclar em customModels apenas se não estiverem no catálogo estático
      if (body.models && Array.isArray(body.models)) {
        const staticCatalog = new Set([
          ...(getStaticCatalog(id) || []),
          ...(PROVIDER_REGISTRY[id]?.models || []),
        ]);
        const genuinelyNew = body.models.map((m) => m.trim()).filter((m) => m && !staticCatalog.has(m));
        if (genuinelyNew.length > 0) {
          cfg.customModels[id] = Array.from(new Set([...(cfg.customModels[id] || []), ...genuinelyNew]));
        }
      }
      if (baseUrl && baseUrl !== PROVIDER_REGISTRY[id].baseUrl) {
        if (!cfg.providerBaseUrls) cfg.providerBaseUrls = {};
        cfg.providerBaseUrls[id] = baseUrl;
      }
      // Garantir que não exista como customProvider duplicado
      if (cfg.customProviders[id]) delete cfg.customProviders[id];
      if (cfg.customProviders[rawId]) delete cfg.customProviders[rawId];
    });
    return c.json({
      ok: true,
      id,
      mergedIntoBuiltin: true,
      message: `Provedor "${id}" já existe nativamente. Credenciais e configurações foram mescladas sem duplicação.`,
      provider: {
        id,
        name: PROVIDER_REGISTRY[id].name,
        baseUrl: cfg.providerBaseUrls?.[id] || PROVIDER_REGISTRY[id].baseUrl,
        apiKeys: apiKeys.map(maskSecret),
        models: [...(PROVIDER_REGISTRY[id].models || []), ...(cfg.customModels[id] || [])],
      },
    });
  }

  // Provedor verdadeiramente novo/customizado
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
  const id = normalizeProviderId(c.req.param("id"));
  const existing = (await getAdminConfig(c.env)).customProviders[id];
  if (!existing) return c.json({ error: { message: "Provedor não encontrado", type: "not_found" } }, 404);
  const cfg = await mutateAdminConfig(c.env, (cfg) => { delete cfg.customProviders[id]; });
  await removeProviderKeys(c.env, id, await getCustomProviderKeys(c.env, id));
  return c.json({ ok: true, id, customProviders: cfg.customProviders });
});

adminRouter.post("/providers/:id/keys", async (c) => {
  const id = normalizeProviderId(c.req.param("id"));
  const body = (await c.req.json()) as { keys?: string[]; credentials?: Array<{ apiKey?: string }> };
  const credentials = (body.credentials || []).map((item) => ({ apiKey: item.apiKey?.trim() || "" }));
  credentials.push(...(body.keys || []).map((apiKey) => ({ apiKey: apiKey.trim() })));
  const merged = await appendProviderCredentials(c.env, id, credentials.filter((item) => item.apiKey));
  return c.json({ ok: true, id, keyCount: merged.length, count: merged.length, keys: merged.map((item) => ({ key: maskSecret(item.apiKey) })) });
});

adminRouter.delete("/providers/:id/keys", async (c) => {
  const id = normalizeProviderId(c.req.param("id"));
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
  const id = normalizeProviderId(c.req.param("id"));
  const body = (await c.req.json()) as { model?: string; models?: string[] };
  const rawModelsToAdd = (body.models && Array.isArray(body.models) ? body.models : [body.model])
    .map((m) => m?.trim())
    .filter((m): m is string => Boolean(m));
  if (rawModelsToAdd.length === 0) {
    return c.json({ error: { message: "Nome do modelo é obrigatório", type: "validation" } }, 400);
  }

  // Falha 6 FIX: filtrar modelos que já existem nativamente no catálogo do provedor
  const staticModels = new Set([
    ...(getStaticCatalog(id) || []),
    ...(PROVIDER_REGISTRY[id]?.models || []),
  ]);
  const modelsToAdd = rawModelsToAdd.filter((m) => !staticModels.has(m));

  const cfg = await mutateAdminConfig(c.env, (cfg) => {
    if (!cfg.removedModels) cfg.removedModels = {};
    if (cfg.removedModels[id]) {
      cfg.removedModels[id] = cfg.removedModels[id].filter((m) => !rawModelsToAdd.includes(m));
    }
    if (modelsToAdd.length > 0) {
      if (cfg.customProviders[id]) {
        const list = cfg.customProviders[id].models;
        for (const model of modelsToAdd) {
          if (!list.includes(model)) list.push(model);
        }
      } else {
        cfg.customModels[id] = Array.from(new Set([...(cfg.customModels[id] || []), ...modelsToAdd]));
      }
    }
    for (const model of rawModelsToAdd) {
      const mk = id + "/" + model;
      if (cfg.modelStates[mk]) delete cfg.modelStates[mk];
    }
  });
  return c.json({
    ok: true,
    id,
    models: modelsToAdd,
    ignoredStaticModelsCount: rawModelsToAdd.length - modelsToAdd.length,
    customModels: cfg.customModels,
    customProviders: cfg.customProviders,
  });
});

adminRouter.post("/providers/:id/fetch-models", async (c) => {
  // Alias de borda ("agy" -> "antigravity"): normalizado em um único ponto,
  // sem hardcodes espalhados pelas camadas de KV/roteamento.
  const id = normalizeProviderId(c.req.param("id"));
  const body = (await c.req.json().catch(() => ({}))) as { apiKey?: string; baseUrl?: string };
  const cfg = await getAdminConfig(c.env);
  const prov = cfg.customProviders[id] || PROVIDER_REGISTRY[id];
  const preset = FREE_PROVIDER_PRESETS.find((p) => p.id === id);

  let apiKey = body.apiKey?.trim() || "";
  if (!apiKey) {
    apiKey = (await selectActiveCredential(c.env, id)).apiKey;
  }

  // Prioriza baseUrl enviado no body, depois customizado no KV, depois env var, depois default do provedor
  const customBaseUrl = body.baseUrl?.trim() || cfg.providerBaseUrls?.[id] || (id === "azure" ? c.env.AZURE_OPENAI_ENDPOINT : undefined);
  const baseUrl = customBaseUrl || prov?.baseUrl || preset?.baseUrl || "";
  const authType: string = (prov && "authType" in prov && typeof (prov as any).authType === "string" ? (prov as any).authType : undefined) || "bearer";
  const headerName: string = (prov && "headerName" in prov && typeof (prov as any).headerName === "string" ? (prov as any).headerName : "api-key");
  const protocol = (prov as any)?.protocol;

  const discovery = await discoverModels(id, {
    apiKey,
    baseUrl,
    authType,
    headerName,
    protocol,
    env: c.env,
  });

  const upstreamModels = discovery.models;
  const upstreamFromApi = discovery.source === "upstream";
  const fetchError = discovery.error;

  // Combinar com catálogo conhecido do provedor e modelos ativos
  const activeCustomModels = cfg.customModels[id] || [];
  const registryModels = prov?.models || [];
  const removedModels = cfg.removedModels?.[id] || [];

  const allAvailable = Array.from(
    new Set([
      ...upstreamModels,
      ...registryModels,
      ...activeCustomModels,
    ])
  ).filter((m) => !removedModels.includes(m));

  return c.json({
    ok: true,
    id,
    models: allAvailable,
    upstreamCount: upstreamModels.length,
    hasUpstream: upstreamFromApi,
    discoverySupported: discovery.discoverySupported,
    source: discovery.source,
    fetchError,
    activeModels: Array.from(new Set([...registryModels, ...activeCustomModels])).filter((m) => !removedModels.includes(m)),
  });
});

/**
 * Despachante unificado para teste direto de modelo/provedor sem side-effects
 */
export async function executeDirectProviderTest(
  env: EnvBindings,
  providerId: string,
  apiKey: string,
  model: string,
  // Modelos "thinking" do Code Assist (3.8 tiered, Opus) levam >12s no
  // primeiro token; um timeout curto marcava como falha um modelo que responde.
  timeoutMs = 30000,
  overrideBaseUrl?: string
): Promise<{
  provider: string;
  model: string;
  status: number;
  latency_ms: number;
  success: boolean;
  output?: string;
  error?: string;
  classification: "ok" | "modelo_inexistente" | "sem_acesso" | "cota_esgotada" | "precisa_pago" | "timeout" | "outro_erro";
}> {
  // Aceita aliases de borda (ex.: "agy") em qualquer chamada de teste.
  providerId = normalizeProviderId(providerId);

  const isReasoningOrNewOpenAI =
    model.includes("o1") ||
    model.includes("o3") ||
    model.includes("gpt-5") ||
    model.startsWith("o");

  const testReq: ChatCompletionRequest = {
    model,
    messages: [{ role: "user" as const, content: "Respond with OK" }],
    max_tokens: isReasoningOrNewOpenAI ? undefined : 5,
    max_completion_tokens: isReasoningOrNewOpenAI ? 10 : undefined,
    temperature: isReasoningOrNewOpenAI ? 1 : 0,
    stream: false,
  };

  const start = Date.now();
  try {
    let resPromise: Promise<Response>;

    if (providerId === "cloudflare-ai") {
      if (!env.AI) {
        return {
          provider: providerId,
          model,
          status: 503,
          latency_ms: 0,
          success: false,
          error: "Cloudflare Workers AI (env.AI) não está habilitado no ambiente",
          classification: "outro_erro",
        };
      }
      resPromise = executeCloudflareAI(testReq, env.AI, model);
    } else if (providerId === "antigravity") {
      const { getValidAntigravityAccessToken } = await import("@/oauth/antigravity");
      const { executeAntigravityRequest } = await import("@/adapters/antigravity");
      const antigravResult = await getValidAntigravityAccessToken(env);
      if (!antigravResult?.accessToken) {
        return {
          provider: providerId,
          model,
          status: 401,
          latency_ms: 0,
          success: false,
          error: "Antigravity: Nenhum token de acesso válido. Realize o login OAuth no painel.",
          classification: "sem_acesso",
        };
      }
      resPromise = executeAntigravityRequest(testReq, antigravResult.accessToken, antigravResult.projectId || "", model);
    } else {
      if (!apiKey && providerId !== "pollinations" && providerId !== "freeapikey") {
        return {
          provider: providerId,
          model,
          status: 401,
          latency_ms: 0,
          success: false,
          error: "Sem chave de API configurada",
          classification: "sem_acesso",
        };
      }
      // Para provedores customizados, ler o protocolo (openai / anthropic) declarado no admin
      const adminCfg = await getAdminConfig(env);
      const customProtocol = adminCfg.customProviders?.[providerId]?.protocol;
      resPromise = executeOpenAICompatible(testReq, providerId, apiKey, model, overrideBaseUrl, customProtocol);
    }

    let res = (await Promise.race([
      resPromise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout " + timeoutMs + "ms")), timeoutMs)
      ),
    ])) as Response;

    // Retry automático com max_completion_tokens se o modelo rejeitar max_tokens
    if (!res.ok && res.status === 400 && !isReasoningOrNewOpenAI) {
      const errPeek = await res.clone().text().catch(() => "");
      if (errPeek.includes("max_completion_tokens") || errPeek.includes("max_tokens")) {
        const retryReq: ChatCompletionRequest = {
          ...testReq,
          max_tokens: undefined,
          max_completion_tokens: 10,
          temperature: 1,
        };
        const retryPromise = executeOpenAICompatible(retryReq, providerId, apiKey, model, overrideBaseUrl);
        const retryRes = await Promise.race([
          retryPromise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout " + timeoutMs + "ms")), timeoutMs)
          ),
        ]).catch(() => null);
        if (retryRes && retryRes.ok) {
          res = retryRes;
        }
      }
    }

    const latency = Date.now() - start;
    if (res.ok) {
      let text = "OK";
      try {
        const j = (await res.json()) as any;
        if (j.choices?.[0]?.message?.content) {
          text = j.choices[0].message.content.trim().slice(0, 40);
        } else if (j.candidates?.[0]?.content?.parts?.[0]?.text) {
          text = j.candidates[0].content.parts[0].text.trim().slice(0, 40);
        } else if (j.response || j.output) {
          text = String(j.response || j.output).trim().slice(0, 40);
        }
      } catch {}
      return { provider: providerId, model, status: res.status, latency_ms: latency, success: true, output: text, classification: "ok" };
    }

    const errText = (await res.text().catch(() => "")).slice(0, 240);
    const classification = classifyError(res.status, errText);
    return { provider: providerId, model, status: res.status, latency_ms: latency, success: false, error: errText, classification };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const classification = msg.includes("Timeout") ? "timeout" : "outro_erro";
    return {
      provider: providerId,
      model,
      status: msg.includes("Timeout") ? 504 : 500,
      latency_ms: Date.now() - start,
      success: false,
      error: msg,
      classification,
    };
  }
}

export function classifyError(status: number, errText?: string): "ok" | "modelo_inexistente" | "sem_acesso" | "cota_esgotada" | "precisa_pago" | "timeout" | "outro_erro" {
  if (status >= 200 && status < 300) return "ok";
  const err = (errText || "").toLowerCase();
  if (status === 408 || status === 504 || err.includes("timeout") || err.includes("abort")) return "timeout";
  if (status === 404 || err.includes("not found") || err.includes("does not exist") || err.includes("invalid model")) return "modelo_inexistente";
  if (status === 401 || status === 403 || err.includes("unauthorized") || err.includes("invalid api key") || err.includes("auth")) return "sem_acesso";
  if (status === 429 || err.includes("quota") || err.includes("rate limit") || err.includes("queue full") || err.includes("exhausted")) return "cota_esgotada";
  if (status === 402 || err.includes("billing") || err.includes("balance") || err.includes("credit") || err.includes("payment")) return "precisa_pago";
  return "outro_erro";
}

adminRouter.post("/providers/:id/test-models", async (c) => {
  const id = normalizeProviderId(c.req.param("id"));
  const body = (await c.req.json().catch(() => ({}))) as {
    apiKey?: string;
    baseUrl?: string;
    models?: string[];
  };
  const cfg = await getAdminConfig(c.env);
  const prov = cfg.customProviders[id] || PROVIDER_REGISTRY[id];
  const activeCustomModels = cfg.customModels[id] || [];
  const registryModels = prov?.models || [];
  const removedModels = cfg.removedModels?.[id] || [];

  // O catalogo do provedor (registry + modelos ativos) e a fonte dos testes:
  // ids desatualizados aqui apareciam como falha mesmo com a chave correta.
  const discovered = Array.from(new Set([...registryModels, ...activeCustomModels]))
    .filter((m) => !removedModels.includes(m));

  // Prioriza modelos passados no body ou os primeiros ativos do provedor
  // (12 em vez de 5, para cobrir catalogos como o da Groq).
  const targetModels = (Array.isArray(body.models) && body.models.length > 0)
    ? body.models.slice(0, 12)
    : discovered.slice(0, 12);

  // Testes de catalogo respeitam a limitacao de fila do Pollinations:
  // Promise.all causa uma rajada e transforma um 429 transitorio em varias falhas.
  if (targetModels.length === 0) {
    return c.json({ ok: false, results: [], message: "Nenhum modelo cadastrado para testar" });
  }

  const explicitKey = body.apiKey?.trim() || "";
  const providerCredentials = explicitKey
    ? [{ apiKey: explicitKey }]
    : await getProviderCredentials(c.env, id);
  const apiKey = providerCredentials[0]?.apiKey || "";
  if (!apiKey && id !== "cloudflare-ai" && id !== "antigravity" && id !== "pollinations" && id !== "freeapikey") {
    return c.json({ error: { message: "Sem chave de API configurada para testar este provedor", type: "auth" } }, 401);
  }

  const effectiveBaseUrl = body.baseUrl?.trim() || cfg.providerBaseUrls?.[id] || (id === "azure" ? c.env.AZURE_OPENAI_ENDPOINT : undefined) || prov?.baseUrl;

  const providerTestTimeoutMs = id === "antigravity" || id === "nvidia" || id === "cheaperinference" ? 30000 : 12000;
  const results: Awaited<ReturnType<typeof executeDirectProviderTest>>[] = [];
  // Chaves limitadas ficam indisponiveis para os modelos seguintes deste mesmo teste.
  let usableCredentials = providerCredentials;
  for (const model of targetModels) {
    // Sequencial: evita rajadas de 429 por cota, fila ou concorrencia do provedor.
    let result: Awaited<ReturnType<typeof executeDirectProviderTest>> | undefined;
    let limitedKey = "";
    for (let keyIndex = 0; keyIndex < Math.max(usableCredentials.length, 1); keyIndex++) {
      const currentKey = usableCredentials[keyIndex]?.apiKey || apiKey;
      result = await executeDirectProviderTest(c.env, id, currentKey, model, providerTestTimeoutMs, effectiveBaseUrl);
      if (result.status !== 429) break;
      limitedKey = currentKey;
      if (currentKey) await markKeyRateLimited(c.env, currentKey, 60);
      if (keyIndex + 1 < usableCredentials.length) continue;
      // Uma repeticao curta separa fila cheia transitoria de cota realmente esgotada.
      await new Promise((resolve) => setTimeout(resolve, id === "pollinations" ? 2500 : 1000));
      result = await executeDirectProviderTest(c.env, id, currentKey, model, providerTestTimeoutMs, effectiveBaseUrl);
    }
    // A chave limitada sai da rotacao deste teste, mas as demais continuam tentando.
    if (result?.status === 429 && limitedKey && usableCredentials.length > 1) {
      usableCredentials = usableCredentials.filter((entry) => entry.apiKey !== limitedKey);
    }
    results.push(result!);
  }

  return c.json({ ok: true, results });
});

adminRouter.delete("/providers/:id/models", async (c) => {
  const id = normalizeProviderId(c.req.param("id"));
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
  { id: "groq", name: "Groq LPU (Ultra-Fast Inference)", eloRank: 2, protocol: "openai", baseUrl: "https://api.groq.com/openai/v1", models: ["openai/gpt-oss-120b", "openai/gpt-oss-20b"], recommendedModels: ["openai/gpt-oss-120b"], freeTier: true, freeTierNotes: "6.000 reqs/dia", supportsStreaming: true, supportsTools: true, supportsVision: false },
  { id: "cerebras", name: "Cerebras WSE-3", eloRank: 3, protocol: "openai", baseUrl: "https://api.cerebras.ai/v1", models: ["gpt-oss-120b", "qwen-3.8-27b"], recommendedModels: ["gpt-oss-120b"], freeTier: true, freeTierNotes: "1M tokens/dia", supportsStreaming: true, supportsTools: true, supportsVision: false },
  { id: "sambanova", name: "SambaNova Systems", eloRank: 4, protocol: "openai", baseUrl: "https://api.sambanova.ai/v1", models: ["Meta-Llama-3.3-70B-Instruct", "Qwen2.5-72B-Instruct"], recommendedModels: ["Meta-Llama-3.3-70B-Instruct"], freeTier: true, freeTierNotes: "LPU gratuito", supportsStreaming: true, supportsTools: true, supportsVision: false },
  // O id do template e "openrouter": "openrouter-free" nao existe como provedor e
  // fazia o teste responder "Provedor desconhecido". Os modelos :free vem do proprio catalogo.
  { id: "openrouter", name: "OpenRouter (modelos gratuitos)", eloRank: 5, protocol: "openai", baseUrl: "https://openrouter.ai/api/v1", models: ["deepseek/deepseek-v4.1-flash", "inclusionai/ling-3.0-flash-vl:free"], recommendedModels: ["inclusionai/ling-3.0-flash-vl:free"], freeTier: true, freeTierNotes: "Modelos gratuitos (:free)", supportsStreaming: true, supportsTools: false, supportsVision: false },
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
      activeProvider: (activeProvider || cfg.searchConfig.activeProvider || "auto") as "auto" | "searxng" | "duckduckgo" | "tavily" | "serper" | "brave" | "firecrawl" | "exa" | "context7" | "linkup" | "searchapi" | "ydc",
      searxngUrl: body.searxngUrl !== undefined ? body.searxngUrl.trim() : cfg.searchConfig.searxngUrl,
      tavilyApiKey: body.tavilyApiKey !== undefined ? body.tavilyApiKey.trim() : cfg.searchConfig.tavilyApiKey,
      serperApiKey: body.serperApiKey !== undefined ? body.serperApiKey.trim() : cfg.searchConfig.serperApiKey,
      braveApiKey: body.braveApiKey !== undefined ? body.braveApiKey.trim() : cfg.searchConfig.braveApiKey,
      firecrawlApiKey: body.firecrawlApiKey !== undefined ? body.firecrawlApiKey.trim() : cfg.searchConfig.firecrawlApiKey,
      exaApiKey: body.exaApiKey !== undefined ? body.exaApiKey.trim() : cfg.searchConfig.exaApiKey,
      context7ApiKey: body.context7ApiKey !== undefined ? body.context7ApiKey.trim() : cfg.searchConfig.context7ApiKey,
      linkupApiKey: body.linkupApiKey !== undefined ? body.linkupApiKey.trim() : cfg.searchConfig.linkupApiKey,
      searchapiApiKey: body.searchapiApiKey !== undefined ? body.searchapiApiKey.trim() : cfg.searchConfig.searchapiApiKey,
      ydcApiKey: body.ydcApiKey !== undefined ? body.ydcApiKey.trim() : cfg.searchConfig.ydcApiKey,
    };
  });
  return c.json({ ok: true, searchConfig: {
    activeProvider: cfg.searchConfig.activeProvider,
    searxngUrl: cfg.searchConfig.searxngUrl,
    tavilyApiKey: maskSecret(cfg.searchConfig.tavilyApiKey),
    serperApiKey: maskSecret(cfg.searchConfig.serperApiKey),
    braveApiKey: maskSecret(cfg.searchConfig.braveApiKey),
    firecrawlApiKey: maskSecret(cfg.searchConfig.firecrawlApiKey),
    exaApiKey: maskSecret(cfg.searchConfig.exaApiKey),
    context7ApiKey: maskSecret(cfg.searchConfig.context7ApiKey),
    linkupApiKey: maskSecret(cfg.searchConfig.linkupApiKey),
    searchapiApiKey: maskSecret(cfg.searchConfig.searchapiApiKey),
    ydcApiKey: maskSecret(cfg.searchConfig.ydcApiKey),
  }});
});

adminRouter.post("/search/test", async (c) => {
  const { dispatchSearch } = await import("@/search/dispatcher");
  const body = (await c.req.json()) as { query: string; provider?: string };
  if (!body.query) return c.json({ error: "query e obrigatorio" }, 400);
  try {
    const rr = await dispatchSearch({ query: body.query } as never, c.env);
    return c.json({ ok: true, engine: rr.provider, results: rr.results || [], total_results: rr.total_results });
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

  // A-7: call provider directly with proper adapter and timeout
  const testTarget = async (target: { provider: string; model: string }) => {
    const provCfg = getProviderConfig(target.provider);
    if (!provCfg) {
      return { provider: target.provider, model: target.model, status: 404, latency_ms: 0, success: false, error: "Provedor não encontrado" };
    }
    const credential = await selectActiveCredential(c.env, target.provider);
    const apiKey = credential.apiKey;
    const customBaseUrl = cfg.providerBaseUrls?.[target.provider] || (target.provider === "azure" ? c.env.AZURE_OPENAI_ENDPOINT : undefined);
    return executeDirectProviderTest(c.env, target.provider, apiKey, target.model, COMBO_TEST_TIMEOUT_MS, customBaseUrl);
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
  const creds = await getStoredProviderCredentials(c.env, "antigravity");
  const hasTokens = creds && creds.length > 0;
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

// ---------------------------------------------------------------------------
// AUTH_TOKEN persistido no KV (sobrevive a redeploys / GitHub Sync)
// ---------------------------------------------------------------------------

/** Retorna se h\u00e1 um token customizado salvo, sem expor o valor. */
adminRouter.get("/settings/auth-token", async (c) => {
  const cfg = await getAdminConfig(c.env);
  const hasCustomToken = Boolean(cfg.authToken && cfg.authToken.trim());
  return c.json({
    ok: true,
    hasCustomToken,
    preview: hasCustomToken ? maskSecret(cfg.authToken!) : null,
  });
});

/**
 * Salva um AUTH_TOKEN customizado no KV.
 * A partir desse momento, o token do KV tem prioridade sobre o wrangler.toml
 * e sobrevive a qualquer redeploy ou sync do fork.
 *
 * Body: { token: string }
 * Resposta: { ok: true, preview: string }  (preview mascarado para confirma\u00e7\u00e3o)
 */
adminRouter.put("/settings/auth-token", async (c) => {
  const body = (await c.req.json()) as { token: string };
  const token = body.token?.trim();
  if (!token || token.length < 4) {
    return c.json(
      { error: { message: "O token deve ter pelo menos 4 caracteres.", type: "validation" } },
      400
    );
  }
  await mutateAdminConfig(c.env, (cfg) => {
    cfg.authToken = token;
  });
  return c.json({ ok: true, preview: maskSecret(token) });
});

/** Remove o token customizado do KV, voltando ao valor do wrangler.toml. */
adminRouter.delete("/settings/auth-token", async (c) => {
  await mutateAdminConfig(c.env, (cfg) => {
    delete cfg.authToken;
  });
  return c.json({ ok: true, message: "Token customizado removido. Sistema usa o valor do wrangler.toml." });
});


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

export default adminRouter;
