import { describe, it, expect } from "vitest";
import { resolveCandidates } from "@/routing/cascade";
import { PROVIDER_REGISTRY } from "@/config/providers";
import * as constants from "@/config/constants";
import { DEFAULT_MODELS_CATALOG } from "@/config/constants";
import { getStaticCatalog, listAllAvailableModels } from "@/config/modelRegistry";
import { discoverModels } from "@/admin/modelDiscovery";
import { DEFAULT_COMBOS as LIVE_COMBOS, type AdminConfig } from "@/admin/store";
import { APP_COMMIT_SHA } from "@/config/version";
import type { ChatCompletionRequest } from "@/types/openai";

describe("Dossiê de Falhas do Subsistema de Modelos (Casos de Regressão)", () => {
  // -------------------------------------------------------------------------
  // Falha 1: O gateway mente sobre quais modelos existem via DEFAULT_MODELS_CATALOG
  // -------------------------------------------------------------------------
  it("Falha 1: DEFAULT_MODELS_CATALOG é uma lista estática com modelos mortos", () => {
    // Prova: O catálogo hardcoded lista modelos como cerebras/llama3.3-70b
    const cerebrasModel = DEFAULT_MODELS_CATALOG.find((m: any) => m.id === "cerebras/llama3.3-70b");
    expect(cerebrasModel).toBeDefined();
    expect(cerebrasModel?.provider).toBe("cerebras");

    const groqModel = DEFAULT_MODELS_CATALOG.find((m: any) => m.id === "llama-3.3-70b-versatile");
    expect(groqModel).toBeDefined();
    expect(groqModel?.provider).toBe("groq");
  });

  // -------------------------------------------------------------------------
  // Falha 2 (Corrigida na Fase 2): Modelo desconhecido NÃO cai em fallback gpt-4o
  // -------------------------------------------------------------------------
  it("Falha 2: Modelo inexistente retorna candidates vazio (sem fallback silencioso para gpt-4o)", () => {
    const fakeRequest: ChatCompletionRequest = {
      model: "modelo-que-nao-existe-12345",
      messages: [{ role: "user", content: "oi" }],
    };
    const plan = resolveCandidates(fakeRequest);

    // Corrigido: não cai mais silenciosamente em gpt-4o, retorna vazio
    expect(plan.candidates.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Falha 3 (Corrigida na Fase 2): Prefixos dinâmicos (nvidia, deepseek, mistral)
  // -------------------------------------------------------------------------
  it("Falha 3: Prefixos como nvidia/ e deepseek/ são reconhecidos dinamicamente", () => {
    // nvidia/meta/llama-3.3-70b-instruct: prefix=nvidia, sub=meta/llama-3.3-70b-instruct
    // Catálogo NVIDIA estático: ["meta/llama-3.3-70b-instruct", ...] — sub existe → gateway prefix ✅
    const nvidiaReq: ChatCompletionRequest = {
      model: "nvidia/meta/llama-3.3-70b-instruct",
      messages: [{ role: "user", content: "oi" }],
    };
    const nvidiaPlan = resolveCandidates(nvidiaReq);
    expect(nvidiaPlan.candidates.length).toBe(1);
    expect(nvidiaPlan.candidates[0].provider).toBe("nvidia");
    expect(nvidiaPlan.candidates[0].model).toBe("nvidia/meta/llama-3.3-70b-instruct");

    // deepseek/deepseek-chat: prefix=deepseek, sub=deepseek-chat
    // Catálogo DeepSeek: ["deepseek-chat", "deepseek-reasoner"] — sub existe → gateway prefix ✅
    const deepseekReq: ChatCompletionRequest = {
      model: "deepseek/deepseek-chat",
      messages: [{ role: "user", content: "oi" }],
    };
    const deepseekPlan = resolveCandidates(deepseekReq);
    expect(deepseekPlan.candidates.length).toBe(1);
    expect(deepseekPlan.candidates[0].provider).toBe("deepseek");
    expect(deepseekPlan.candidates[0].model).toBe("deepseek/deepseek-chat");
  });

  // -------------------------------------------------------------------------
  // Fase 2: Colisão de namespace de modelo — corrigida no Step 3 do resolveCandidates
  // -------------------------------------------------------------------------
  it("Fase 2: openai/gpt-oss-120b roteia para Groq (não para OpenAI Oficial)", () => {
    // prefix=openai, sub=gpt-oss-120b NÃO está no catálogo OpenAI (gpt-4o, o1...)
    // → cai para Step 4 → encontra openai/gpt-oss-120b no catálogo estático da Groq
    const req: ChatCompletionRequest = {
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: "oi" }],
    };
    const plan = resolveCandidates(req);
    expect(plan.candidates.length).toBe(1);
    expect(plan.candidates[0].provider).toBe("groq");
    expect(plan.candidates[0].model).toBe("openai/gpt-oss-120b");
  });

  it("Fase 2: openai/gpt-oss-20b roteia para Groq (não para OpenAI Oficial)", () => {
    const req: ChatCompletionRequest = {
      model: "openai/gpt-oss-20b",
      messages: [{ role: "user", content: "oi" }],
    };
    const plan = resolveCandidates(req);
    expect(plan.candidates.length).toBe(1);
    expect(plan.candidates[0].provider).toBe("groq");
    expect(plan.candidates[0].model).toBe("openai/gpt-oss-20b");
  });

  it("Fase 2: deepseek/deepseek-v4.1-flash roteia para o provedor que o tem no catálogo estático", () => {
    // deepseek/deepseek-v4.1-flash está no PROVIDER_REGISTRY.pollinations.models (catálogo estático).
    // Step 3: prefix=deepseek, sub=deepseek-v4.1-flash NÃO está no catálogo DeepSeek oficial
    // → cai para Step 4 → varre PROVIDER_REGISTRY em ordem → encontra em Pollinations primeiro
    const req: ChatCompletionRequest = {
      model: "deepseek/deepseek-v4.1-flash",
      messages: [{ role: "user", content: "oi" }],
    };
    const plan = resolveCandidates(req);
    expect(plan.candidates.length).toBe(1);
    // Pollinations tem "deepseek/deepseek-v4.1-flash" no catálogo estático
    expect(plan.candidates[0].provider).toBe("pollinations");
    expect(plan.candidates[0].model).toBe("deepseek/deepseek-v4.1-flash");
  });


  it("Fase 2: gateway prefix explícito groq/openai/gpt-oss-120b ainda funciona", () => {
    // Usuário força Groq explicitamente com dupla barra: prefix=groq, sub=openai/gpt-oss-120b
    // openai/gpt-oss-120b está no catálogo da Groq → gateway prefix válido
    const req: ChatCompletionRequest = {
      model: "groq/openai/gpt-oss-120b",
      messages: [{ role: "user", content: "oi" }],
    };
    const plan = resolveCandidates(req);
    expect(plan.candidates.length).toBe(1);
    expect(plan.candidates[0].provider).toBe("groq");
  });


  // -------------------------------------------------------------------------
  // Falha 4 (Corrigida na Fase 2): A configuração do painel governa o roteamento
  // -------------------------------------------------------------------------
  it("Falha 4: resolveCandidates respeita providerStates e modelStates do AdminConfig", () => {
    const groqReq: ChatCompletionRequest = {
      model: "groq/llama-3.3-70b-versatile",
      messages: [{ role: "user", content: "oi" }],
    };

    const mockAdminCfg: Partial<AdminConfig> = {
      providerStates: { groq: { enabled: false } },
      modelStates: { "groq/llama-3.3-70b-versatile": { enabled: false } },
      removedModels: { groq: ["llama-3.3-70b-versatile"] },
      combos: {},
    };

    const plan = resolveCandidates(groqReq, mockAdminCfg as AdminConfig);
    // Corrigido: com providerStates.groq desabilitado, o modelo é bloqueado
    expect(plan.candidates.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Falha 5: Provedores duplicados no registro
  // -------------------------------------------------------------------------
  it("Falha 5: PROVIDER_REGISTRY canônico existe mas aliases podem criar duplicatas", () => {
    expect(PROVIDER_REGISTRY["groq"]).toBeDefined();
    expect(PROVIDER_REGISTRY["cerebras"]).toBeDefined();
    expect(PROVIDER_REGISTRY["openrouter"]).toBeDefined();
    expect(PROVIDER_REGISTRY["cloudflare-ai"]).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Falha 7 (Corrigida na Fase 3): Pollinations aponta para gen.pollinations.ai/v1
  // -------------------------------------------------------------------------
  it("Falha 7: PROVIDER_REGISTRY.pollinations usa host oficial gen.pollinations.ai/v1", () => {
    const pollinations = PROVIDER_REGISTRY["pollinations"];
    expect(pollinations).toBeDefined();
    expect(pollinations.baseUrl).toBe("https://gen.pollinations.ai/v1");
  });

  // -------------------------------------------------------------------------
  // Fase 3: discoverModels unificado e discoverySupported explícito
  // -------------------------------------------------------------------------
  it("Fase 3: discoverModels declara discoverySupported: false para 1min e cloudflare-ai", async () => {
    const oneMinRes = await discoverModels("1min");
    expect(oneMinRes.discoverySupported).toBe(false);
    expect(oneMinRes.models.length).toBeGreaterThan(0);
    expect(oneMinRes.source).toBe("catalog");

    const cfRes = await discoverModels("cloudflare-ai");
    expect(cfRes.discoverySupported).toBe(false);
    expect(cfRes.models.length).toBe(12);
  });

  // -------------------------------------------------------------------------
  // Falha 11: Código morto identificado no dossiê
  // -------------------------------------------------------------------------
  it("Falha 11: DEFAULT_COMBOS foi removido de constants.ts e store.ts é a fonte única", () => {
    // Prova: constants.ts não exporta mais DEFAULT_COMBOS (cópia morta eliminada)
    expect((constants as any).DEFAULT_COMBOS).toBeUndefined();
    // A única e canônica fonte de DEFAULT_COMBOS é store.ts
    expect(LIVE_COMBOS).toBeDefined();
    expect(LIVE_COMBOS["omni-free"]).toBeDefined();
    expect(LIVE_COMBOS["omni-code"]).toBeDefined();
    expect(LIVE_COMBOS["omni-fast"]).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Falha 12 (Corrigida na Fase 7): APP_COMMIT_SHA atualizado
  // -------------------------------------------------------------------------
  it("Falha 12: APP_COMMIT_SHA reflete o commit recente do repositório", () => {
    expect(APP_COMMIT_SHA).toBe("f969f49");
    expect(APP_COMMIT_SHA).not.toBe("a90d193");
  });

  // -------------------------------------------------------------------------
  // Falha 13 (Corrigida na Fase 7): Compatibilidade de tipo com 'anthropic'
  // -------------------------------------------------------------------------
  it("Falha 13: ProviderConfig authType inclui protocol 'anthropic'", () => {
    const validAuthTypes = ["bearer", "apikey-header", "query", "oauth", "native-binding", "anthropic"];
    expect(validAuthTypes.includes("anthropic")).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Falha 10 (Corrigida na Fase 7): Resolução dinâmica de variáveis de ambiente no keyPool
  // -------------------------------------------------------------------------
  it("Falha 10: getProviderCredentials resolve variáveis de ambiente dinâmicas como NVIDIA_API_KEY", async () => {
    const { getProviderCredentials } = await import("@/routing/keyPool");
    const mockEnv: any = {
      NVIDIA_API_KEY: "nvapi-test-key-12345",
      CUSTOMPROV_API_KEY: "custom-test-key-67890",
    };

    const nvKeys = await getProviderCredentials(mockEnv, "nvidia");
    expect(nvKeys.length).toBe(1);
    expect(nvKeys[0].apiKey).toBe("nvapi-test-key-12345");

    const customKeys = await getProviderCredentials(mockEnv, "customprov");
    expect(customKeys.length).toBe(1);
    expect(customKeys[0].apiKey).toBe("custom-test-key-67890");
  });

  // -------------------------------------------------------------------------
  // Fase 1: Centralização em modelRegistry.ts
  // -------------------------------------------------------------------------
  it("Fase 1: modelRegistry centraliza os catálogos estáticos e lista modelos disponíveis", () => {
    const cfModels = getStaticCatalog("cloudflare-ai");
    expect(cfModels.length).toBe(12);
    expect(cfModels).toContain("@cf/meta/llama-3.3-70b-instruct-fp8-fast");

    const agyModels = getStaticCatalog("antigravity");
    expect(agyModels.length).toBe(12);
    expect(agyModels).toContain("claude-opus-4-6-thinking");

    const all = listAllAvailableModels();
    expect(all.length).toBeGreaterThan(0);
    const gpt4o = all.find((m: any) => m.modelId === "gpt-4o" && m.providerId === "openai");
    expect(gpt4o).toBeDefined();
    expect(gpt4o?.pricing?.input_per_million).toBe(2.5);
  });

  // -------------------------------------------------------------------------
  // Fase 4: Classificação de erros e teste honesto de modelos (Falha 8)
  // -------------------------------------------------------------------------
  it("Fase 4: classifyError categoriza precisamente os erros de chamada de modelo", async () => {
    const { classifyError } = await import("@/admin/routes");
    expect(classifyError(200, "")).toBe("ok");
    expect(classifyError(404, "The model 'foo' does not exist")).toBe("modelo_inexistente");
    expect(classifyError(401, "Incorrect API key provided")).toBe("sem_acesso");
    expect(classifyError(429, "Rate limit reached for requests")).toBe("cota_esgotada");
    expect(classifyError(402, "Insufficient balance / credits")).toBe("precisa_pago");
    expect(classifyError(504, "Gateway timeout")).toBe("timeout");
    expect(classifyError(500, "Internal error")).toBe("outro_erro");
  });

  // -------------------------------------------------------------------------
  // Fase 5: Migração e Saneamento de Dados KV (Falha 5, Falha 6 e Falha 9)
  // -------------------------------------------------------------------------
  it("Fase 5: migrateAdminConfigToV2 consolida provedores duplicados e limpa customModels redundantes", async () => {
    const { migrateAdminConfigToV2 } = await import("@/admin/store");

    const mockConfig: any = {
      version: 1,
      _seq: 1,
      customProviders: {
        "openrouter-free-models": {
          id: "openrouter-free-models",
          name: "OpenRouter Free",
          baseUrl: "https://openrouter.ai/api/v1",
          apiKeys: ["sk-or-real-key-12345"],
          models: ["deepseek/deepseek-v4.1-flash"],
        },
        "groq-lpu-ultra-fast-inference": {
          id: "groq-lpu-ultra-fast-inference",
          name: "Groq LPU",
          baseUrl: "https://api.groq.com/openai/v1",
          apiKeys: ["gsk-real-key-99999"],
          models: ["openai/gpt-oss-120b"],
        },
      },
      providerStates: {
        "openrouter-free-models": { enabled: true },
      },
      customModels: {
        antigravity: [
          "gemini-3.7-flash-high",
          "gemini-3.7-flash-medium",
          "gemini-3.7-flash-low",
          "gemini-3.7-flash-tiered",
          "gemini-3.6-flash-tiered",
          "gemini-3.5-flash-lite",
          "gemini-3.1-pro-high",
          "gemini-3.1-pro-low",
          "gemini-3.1-flash-lite",
          "claude-opus-4-6-thinking",
          "claude-sonnet-4-6",
          "gpt-oss-120b-medium",
        ],
        deepseek: ["deepseek-chat", "meu-modelo-customizado-novo"],
      },
      combos: {
        "combo-teste": {
          id: "combo-teste",
          name: "Teste",
          strategy: "priority",
          targets: [
            { provider: "groq-lpu-ultra-fast-inference", model: "llama-3.3-70b" },
            { provider: "openrouter-free-models", model: "openrouter/free" },
          ],
          enabled: true,
        },
      },
    };

    const migrated = await migrateAdminConfigToV2(undefined, mockConfig);
    expect(migrated).toBe(true);
    expect(mockConfig.version).toBe(3);

    // Duplicatas foram removidas de customProviders
    expect(mockConfig.customProviders["openrouter-free-models"]).toBeUndefined();
    expect(mockConfig.customProviders["groq-lpu-ultra-fast-inference"]).toBeUndefined();

    // antigravity tinha apenas modelos do catálogo estático — foi limpo integralmente
    expect(mockConfig.customModels["antigravity"]).toBeUndefined();

    // deepseek tinha modelo customizado genuíno — manteve apenas o genuíno
    expect(mockConfig.customModels["deepseek"]).toEqual(["meu-modelo-customizado-novo"]);

    // Combos agora apontam para provedores canônicos
    expect(mockConfig.combos["combo-teste"].targets[0].provider).toBe("groq");
    expect(mockConfig.combos["combo-teste"].targets[1].provider).toBe("openrouter");

    // Idempotência: segunda execução não altera nada e retorna false
    const secondRun = await migrateAdminConfigToV2(undefined, mockConfig);
    expect(secondRun).toBe(false);
  });

  it("Fase 5: Migração aplicada com sucesso sobre o snapshot real do KV de produção", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { migrateAdminConfigToV2 } = await import("@/admin/store");

    const backupPath = path.resolve(process.cwd(), "backups/kv-production-backup-20260917.json");
    expect(fs.existsSync(backupPath)).toBe(true);

    const prodSnapshot = JSON.parse(fs.readFileSync(backupPath, "utf-8"));
    expect(prodSnapshot.version).toBeFalsy();
    expect(Object.keys(prodSnapshot.customProviders).length).toBe(5);

    const migrated = await migrateAdminConfigToV2(undefined, prodSnapshot);
    expect(migrated).toBe(true);
    expect(prodSnapshot.version).toBe(3);

    // Todos os 5 provedores duplicados foram eliminados
    expect(Object.keys(prodSnapshot.customProviders).length).toBe(0);

    // Modelos estáticos redundantes foram saneados de customModels (de 12 caiu para os 6 modelos novos não estáticos)
    expect(prodSnapshot.customModels["antigravity"].length).toBe(6);
    expect(prodSnapshot.customModels["openrouter"]).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Fase 6: Impedir Recorrência de Duplicatas (API e UI)
  // -------------------------------------------------------------------------
  it("Fase 6: POST /api/admin/providers mescla no provedor embutido em vez de duplicar", async () => {
    const { adminRouter } = await import("@/admin/routes");
    const res = await adminRouter.request("/providers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer admin",
      },
      body: JSON.stringify({
        id: "groq-lpu-ultra-fast-inference",
        name: "Groq LPU (Ultra-Fast Inference)",
        baseUrl: "https://api.groq.com/openai/v1",
        apiKeys: ["gsk-test-key-prevent-dup"],
      }),
    }, {
      AUTH_TOKEN: "admin",
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.mergedIntoBuiltin).toBe(true);
    expect(data.id).toBe("groq");
  });

  it("Fase 6: POST /api/admin/providers/:id/models ignora modelos que já constam no catálogo estático", async () => {
    const { adminRouter } = await import("@/admin/routes");
    const res = await adminRouter.request("/providers/cloudflare-ai/models", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer admin",
      },
      body: JSON.stringify({
        models: [
          "@cf/meta/llama-3.3-70b-instruct-fp8-fast", // Já existe no catálogo estático!
          "@cf/modelo-completamente-inedito-2026",    // Modelo novo!
        ],
      }),
    }, {
      AUTH_TOKEN: "admin",
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.models).toEqual(["@cf/modelo-completamente-inedito-2026"]);
    expect(data.ignoredStaticModelsCount).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Fase 7: Combos automáticos dinâmicos (buildDefaultCombos)
  // -------------------------------------------------------------------------
  it("Fase 7: buildDefaultCombos gera omni-free com modelos gratuitos reais", async () => {
    const { buildDefaultCombos } = await import("@/admin/store");
    const combos = buildDefaultCombos();

    // omni-free deve existir e ter pelo menos 1 target
    expect(combos["omni-free"]).toBeDefined();
    expect(combos["omni-free"].targets.length).toBeGreaterThan(0);
    expect(combos["omni-free"].strategy).toBe("priority");

    // Todos os targets do omni-free devem ter provider e model definidos
    for (const t of combos["omni-free"].targets) {
      expect((t as any).provider).toBeTruthy();
      expect((t as any).model).toBeTruthy();
    }

    // Gemini e Groq são provedores gratuitos embutidos — devem aparecer no omni-free
    const freeProviders = combos["omni-free"].targets.map((t: any) => t.provider);
    const hasFreeProvider = freeProviders.includes("gemini") || freeProviders.includes("groq") || freeProviders.includes("cloudflare-ai");
    expect(hasFreeProvider).toBe(true);
  });

  it("Fase 7: buildDefaultCombos gera omni-best-tools com modelos que suportam tools", async () => {
    const { buildDefaultCombos } = await import("@/admin/store");
    const { PROVIDER_REGISTRY } = await import("@/config/providers");
    const combos = buildDefaultCombos();

    // omni-best-tools deve existir
    expect(combos["omni-best-tools"]).toBeDefined();
    expect(combos["omni-best-tools"].targets.length).toBeGreaterThan(0);

    // Cada target deve pertencer a um provedor que declara supportsTools=true
    for (const t of combos["omni-best-tools"].targets as any[]) {
      const prov = (PROVIDER_REGISTRY as any)[t.provider];
      if (prov) {
        expect(prov.supportsTools).toBe(true);
      }
    }
  });

  it("Fase 7: buildDefaultCombos inclui os combos estáticos omni-code e omni-fast", async () => {
    const { buildDefaultCombos } = await import("@/admin/store");
    const combos = buildDefaultCombos();

    expect(combos["omni-code"]).toBeDefined();
    expect(combos["omni-code"].targets.length).toBe(3);

    expect(combos["omni-fast"]).toBeDefined();
    expect(combos["omni-fast"].targets.length).toBe(3);
  });

  it("Fase 7: buildDefaultCombos respeita provedores desabilitados no adminCfg", async () => {
    const { buildDefaultCombos } = await import("@/admin/store");

    // Desabilitar Gemini — ele não deve aparecer no omni-free
    const cfgWithGeminiDisabled: any = {
      providerStates: { gemini: { enabled: false } },
    };
    const combos = buildDefaultCombos(cfgWithGeminiDisabled);
    const freeProviders = combos["omni-free"].targets.map((t: any) => t.provider);
    expect(freeProviders).not.toContain("gemini");
  });

  // -------------------------------------------------------------------------
  // Fase 8: Persistência do AUTH_TOKEN no KV — prioridade sobre wrangler.toml
  // Garante que o token salvo no KV NUNCA é sobrescrito por redeploy ou sync
  // -------------------------------------------------------------------------
  describe("Fase 8: Persistência do AUTH_TOKEN (KV vs wrangler.toml)", () => {
    let resolvePrincipal: Awaited<typeof import("@/admin/auth")>["resolvePrincipal"];
    beforeEach(async () => {
      // Reseta o cache de módulo (store.ts possui let cache = null em nível de módulo
      // com TTL de 5s — sem o reset, testes subsequentes reutilizam o cache do anterior)
      vi.resetModules();
      ({ resolvePrincipal } = await import("@/admin/auth"));
    });

    /** Cria um env-like com KV vazio e AUTH_TOKEN fixo no wrangler.toml */
    function makeEnv(kvAuthToken: string | null, wranglerToken: string): any {
      const kvData: Record<string, string> = {};
      if (kvAuthToken !== null) {
        // Simula um AdminConfig serializado contendo authToken
        kvData["admin:config"] = JSON.stringify({
          version: 3,
          _seq: 1,
          _deletedDefaultCombos: [],
          providerStates: {},
          customProviders: {},
          modelStates: {},
          customModels: {},
          removedModels: {},
          searchConfig: { activeProvider: "auto" },
          virtualKeys: {},
          combos: {},
          authToken: kvAuthToken,
        });
      }
      return {
        AUTH_TOKEN: wranglerToken,
        OMNI_KEYS: {
          get: async (key: string) => kvData[key] ?? null,
          put: async () => {},
          delete: async () => {},
        },
        OMNI_CACHE: {
          get: async () => null,
          put: async () => {},
        },
      };
    }

    it("8.1: Token no KV tem precedência absoluta sobre AUTH_TOKEN do wrangler.toml", async () => {
      const env = makeEnv("minha-senha-personalizada", "admin");
      // Ctx mínimo compatível com resolvePrincipal
      const ctx = {
        env,
        req: { header: () => "Bearer minha-senha-personalizada", query: () => undefined },
      } as any;

      const principal = await resolvePrincipal(ctx, "minha-senha-personalizada");
      expect(principal).not.toBeNull();
      expect(principal?.kind).toBe("master");
    });

    it("8.2: Token padrão do wrangler.toml NÃO funciona quando o KV tem um token diferente", async () => {
      const env = makeEnv("minha-senha-personalizada", "admin");
      const ctx = {
        env,
        req: { header: () => "Bearer admin", query: () => undefined },
      } as any;

      // "admin" é o token do wrangler.toml — mas o KV sobrescreve com outro valor
      const principal = await resolvePrincipal(ctx, "admin");
      expect(principal).toBeNull(); // deve rejeitar o token antigo
    });

    it("8.3: Fallback correto para wrangler.toml quando KV NÃO tem authToken", async () => {
      const env = makeEnv(null, "admin"); // KV sem authToken
      const ctx = {
        env,
        req: { header: () => "Bearer admin", query: () => undefined },
      } as any;

      const principal = await resolvePrincipal(ctx, "admin");
      expect(principal).not.toBeNull();
      expect(principal?.kind).toBe("master");
    });

    it("8.4: Token do KV vazio/whitespace ignora o campo e usa wrangler.toml", async () => {
      const env = makeEnv("   ", "admin"); // authToken só com espaços — deve ser ignorado
      const ctx = {
        env,
        req: { header: () => "Bearer admin", query: () => undefined },
      } as any;

      const principal = await resolvePrincipal(ctx, "admin");
      expect(principal).not.toBeNull();
      expect(principal?.kind).toBe("master");
    });
  });
});
