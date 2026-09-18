import type { EnvBindings } from "@/types/provider";
import { ANTIGRAVITY_PUBLIC_CONFIG } from "@/config/constants";
import { normalizeProviderId } from "@/config/providerAliases";
import { getStaticCatalog, listAllAvailableModels } from "@/config/modelRegistry";
import { PROVIDER_REGISTRY } from "@/config/providers";
export interface ProviderCredential {
  apiKey: string;
}

// =============================================================================
// Store Administrativo do VeroRoute Edge (persistido no Cloudflare KV OMNI_KEYS)
// Fixes: A-5 (combo deletion blacklist), A-6 (optimistic-concurrency mutate)
// =============================================================================

export interface CustomProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKeys: string[];
  protocol: "openai" | "anthropic";
  models: string[];
  freeTier: boolean;
  costPerMillionInput: number;
  costPerMillionOutput: number;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
}

export interface AdminSearchConfig {
  activeProvider: "auto" | "searxng" | "duckduckgo" | "tavily" | "serper" | "brave" | "firecrawl" | "exa" | "context7" | "linkup" | "searchapi" | "ydc";
  searxngUrl?: string;
  tavilyApiKey?: string;
  serperApiKey?: string;
  braveApiKey?: string;
  firecrawlApiKey?: string;
  exaApiKey?: string;
  context7ApiKey?: string;
  linkupApiKey?: string;
  searchapiApiKey?: string;
  ydcApiKey?: string;
}

export interface VirtualApiKey {
  id: string;
  name: string;
  createdAt: string;
  allowedModels: string[];
  rpmLimit?: number;
  totalRequests: number;
  lastUsedAt?: string;
  enabled: boolean;
}

export interface ComboTarget {
  provider: string;
  model: string;
  weight?: number;
  priority?: number;
}

export interface ComboConfig {
  id: string;
  name: string;
  description?: string;
  strategy: "priority" | "round-robin" | "p2c" | "lowest-cost" | "random";
  targets: ComboTarget[];
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AntigravityOAuthConfig {
  clientId: string;
  clientSecret: string;
  updatedAt?: string;
}

export interface AdminConfig {
  version: number;
  /** Monotonic counter incremented on every save — used for optimistic-concurrency retry (A-6). */
  _seq: number;
  /** IDs of built-in default combos deliberately deleted by the admin — prevents resurrection on merge (A-5). */
  _deletedDefaultCombos: string[];
  providerStates: Record<string, { enabled: boolean }>;
  customProviders: Record<string, CustomProvider>;
  modelStates: Record<string, { enabled: boolean }>;
  customModels: Record<string, string[]>;
  removedModels: Record<string, string[]>;
  searchConfig: AdminSearchConfig;
  virtualKeys: Record<string, VirtualApiKey>;
  combos: Record<string, ComboConfig>;
  antigravityConfig?: AntigravityOAuthConfig;
  providerBaseUrls?: Record<string, string>;
  /**
   * AUTH_TOKEN persistido no KV pelo usuário via painel.
   * Quando presente, sobrescreve o valor do wrangler.toml [vars],
   * sobrevivendo a redeploys e sync do fork do GitHub.
   * Quando ausente, o sistema cai para c.env.AUTH_TOKEN (padrão "admin").
   */
  authToken?: string;
}

// ---------------------------------------------------------------------------
// Built-in default combos
// ---------------------------------------------------------------------------

// Combos estáticos (não dependem dos provedores ativos)
const STATIC_COMBO_DEFINITIONS: Record<string, ComboConfig> = {
  "omni-code": {
    id: "omni-code",
    name: "Omni Code Specialist",
    description: "Roteamento inteligente para tarefas de programação",
    strategy: "priority",
    targets: [
      { provider: "gemini", model: "gemini-2.0-flash", priority: 1 },
      { provider: "groq", model: "qwen-2.5-coder-32b", priority: 2 },
      { provider: "cloudflare-ai", model: "@cf/qwen/qwen2.5-coder-32b-instruct", priority: 3 },
    ],
    enabled: true,
  },
  "omni-fast": {
    id: "omni-fast",
    name: "Omni Ultra Fast",
    description: "Latência mínima com modelos menores e rápidos",
    strategy: "priority",
    targets: [
      { provider: "groq", model: "llama-3.1-8b-instant", priority: 1 },
      { provider: "cloudflare-ai", model: "@cf/meta/llama-3.1-8b-instruct", priority: 2 },
      { provider: "gemini", model: "gemini-2.0-flash-lite", priority: 3 },
    ],
    enabled: true,
  },
};

/**
 * Prioridade de provedores para o combo omni-free.
 * Ordena provedores gratuitos do melhor ao mais limitado.
 */
const PROVIDER_PRIORITY_FREE = [
  "antigravity",    // Google OAuth — sem custo, alta qualidade
  "gemini",         // Gemini Direct API — free tier generoso
  "cloudflare-ai",  // Workers AI — completamente gratuito
  "groq",           // LPU ultra-rápido — free tier
  "cerebras",       // Wafer-Scale Engine — free tier
  "sambanova",      // free tier
  "openrouter",     // modelos :free
  "pollinations",   // proxy gratuito
];

/**
 * Prioridade de provedores para o combo omni-best-tools.
 * Ordena provedores com suporte a tools pelo custo-benefício.
 */
const PROVIDER_PRIORITY_TOOLS = [
  "gemini",
  "antigravity",
  "openai",
  "alibaba",
  "groq",
  "cerebras",
  "cloudflare-ai",
  "openrouter",
  "1min",
];

/**
 * Gera os combos padrão dinâmicos baseados nos provedores e modelos disponíveis.
 *
 * - omni-free: todos os modelos com free_tier=true, ordenados por qualidade/prioridade
 * - omni-best-tools: modelos com supportsTools=true e custo ≤ $1/M ou free
 * - omni-code: estático (foco em programação)
 * - omni-fast: estático (foco em latência mínima)
 *
 * @param adminCfg Config atual do KV — se omitida, usa apenas os provedores embutidos.
 */
export function buildDefaultCombos(adminCfg?: Partial<AdminConfig>): Record<string, ComboConfig> {
  const allModels = listAllAvailableModels(adminCfg as AdminConfig | undefined);

  // --- omni-free: modelos gratuitos ---
  const freeModels = allModels
    .filter((m) => m.pricing?.free_tier === true)
    .sort((a, b) => {
      const pa = PROVIDER_PRIORITY_FREE.indexOf(a.providerId);
      const pb = PROVIDER_PRIORITY_FREE.indexOf(b.providerId);
      return (pa === -1 ? 999 : pa) - (pb === -1 ? 999 : pb);
    })
    .slice(0, 6);

  const freeTargets: ComboTarget[] =
    freeModels.length > 0
      ? freeModels.map((m, i) => ({ provider: m.providerId, model: m.modelId, priority: i + 1 }))
      : [
          // fallback estático se nenhum provedor estiver configurado
          { provider: "gemini", model: "gemini-2.0-flash", priority: 1 },
          { provider: "cloudflare-ai", model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", priority: 2 },
          { provider: "groq", model: "llama-3.3-70b-versatile", priority: 3 },
        ];

  // --- omni-best-tools: modelos com tools + custo baixo ---
  const toolsModels = allModels
    .filter(
      (m) =>
        m.capabilities?.tools === true &&
        (m.pricing?.free_tier === true || (m.pricing?.input_per_million ?? 999) <= 1.0),
    )
    .sort((a, b) => {
      const pa = PROVIDER_PRIORITY_TOOLS.indexOf(a.providerId);
      const pb = PROVIDER_PRIORITY_TOOLS.indexOf(b.providerId);
      return (pa === -1 ? 999 : pa) - (pb === -1 ? 999 : pb);
    })
    .slice(0, 6);

  const toolsTargets: ComboTarget[] =
    toolsModels.length > 0
      ? toolsModels.map((m, i) => ({ provider: m.providerId, model: m.modelId, priority: i + 1 }))
      : [
          { provider: "gemini", model: "gemini-2.5-flash", priority: 1 },
          { provider: "groq", model: "llama-3.3-70b-versatile", priority: 2 },
        ];

  return {
    "omni-free": {
      id: "omni-free",
      name: "Omni Free Tier",
      description: "Cascata automática de modelos gratuitos de alta qualidade",
      strategy: "priority",
      targets: freeTargets,
      enabled: true,
    },
    "omni-best-tools": {
      id: "omni-best-tools",
      name: "Omni Best Tools",
      description: "Modelos com suporte a tools de baixo custo",
      strategy: "priority",
      targets: toolsTargets,
      enabled: true,
    },
    ...STATIC_COMBO_DEFINITIONS,
  };
}

/**
 * Snapshot estático dos combos padrão — mantido para compatibilidade com testes
 * e com o roteador de cascata (que não tem acesso ao KV).
 * Para o conjunto completo e dinâmico, use buildDefaultCombos(adminCfg).
 */
const DEFAULT_COMBOS: Record<string, ComboConfig> = buildDefaultCombos();

// Expose for use in cascade/routes without importing the whole store
export { DEFAULT_COMBOS };

const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  version: 3,
  _seq: 0,
  _deletedDefaultCombos: [],
  providerStates: {},
  customProviders: {},
  modelStates: {},
  customModels: {},
  removedModels: {},
  searchConfig: {
    activeProvider: "auto",
    searxngUrl: "",
    tavilyApiKey: "",
    serperApiKey: "",
    braveApiKey: "",
  },
  virtualKeys: {},
  combos: {},
  providerBaseUrls: {},
};

const KV_ADMIN_KEY = "admin:config";
const KV_CUSTOM_KEYS_PREFIX = "keys_";

const CACHE_TTL_MS = 5_000;
let cache: { data: AdminConfig; ts: number } | null = null;

function cloneConfig(cfg: AdminConfig): AdminConfig {
  return JSON.parse(JSON.stringify(cfg));
}

function invalidateCache(): void {
  cache = null;
}

/**
 * Build the effective combos map — A-5:
 *  1. Default combos not in _deletedDefaultCombos
 *  2. Overlaid with admin-persisted combos (created / updated)
 */
function mergeComos(p: Partial<AdminConfig>): Record<string, ComboConfig> {
  const deleted = new Set<string>(p._deletedDefaultCombos ?? []);
  const dynamicDefaults = buildDefaultCombos(p);
  const base: Record<string, ComboConfig> = {};
  for (const [id, cfg] of Object.entries(dynamicDefaults)) {
    if (!deleted.has(id)) base[id] = cfg;
  }
  return { ...base, ...(p.combos ?? {}) };
}

/**
 * Migração Idempotente de Configuração do Painel Administrativo para v3.
 * v2 → v3: reprocessa provedores duplicados que escaparam da migração anterior
 *   (o KV de produção já estava em v2, então a migração nunca corria novamente).
 * - Saneia provedores customizados duplicados (openrouter-free, groq-lpu, cerebras-wse, cloudflare-workers-ai-native)
 * - Transfere credenciais de chaves para os provedores canônicos sem perda
 * - Limpa modelos duplicados em customModels que já constam nos catálogos estáticos
 * - Limpa modelStates e removedModels de referências a IDs duplicados
 * - Ajusta alvos de combos para apontar para provedores canônicos
 */
export async function migrateAdminConfigToV2(
  env: EnvBindings | undefined,
  cfg: AdminConfig
): Promise<boolean> {
  // =========================================================================
  // ⚠️  CONTRATO ARQUITETURAL — NÃO VIOLAR JAMAIS:
  //
  // Esta função é chamada DENTRO de getAdminConfig(), que por sua vez é
  // chamada dentro de mutateAdminConfig(). Por isso, ela NÃO pode chamar:
  //   - mutateAdminConfig()
  //   - getAdminConfig()
  //   - appendProviderKeys() / appendProviderCredentials()
  //   - setStoredProviderCredentials() / setCustomProviderKeys()
  //   - qualquer outra função que internamente chame mutateAdminConfig()
  //
  // Para persistir dados no KV durante a migração, use kv.put() DIRETAMENTE.
  // Violar este contrato causa recursão infinita → timeout 504 no Worker.
  // =========================================================================
  if (cfg.version && cfg.version >= 3) {
    return false;
  }

  cfg.customProviders = cfg.customProviders || {};
  cfg.customModels = cfg.customModels || {};
  cfg.removedModels = cfg.removedModels || {};
  cfg.providerStates = cfg.providerStates || {};
  cfg.combos = cfg.combos || {};
  cfg.virtualKeys = cfg.virtualKeys || {};
  cfg.providerBaseUrls = cfg.providerBaseUrls || {};
  cfg.modelStates = cfg.modelStates || {};

  let modified = false;
  const kv = env?.OMNI_KEYS;

  // 1. Consolidar provedores customizados que são duplicatas de provedores canônicos
  const customProviderEntries = Object.entries(cfg.customProviders);
  for (const [dupId, dupProv] of customProviderEntries) {
    const canonicalId = normalizeProviderId(dupId);
    if (canonicalId !== dupId) {
      // a) Resgatar credenciais reais do KV (sem máscara) ou do objeto
      let realKeys: string[] = [];

      if (kv) {
        const rawCreds = await kv.get("credentials_" + dupId);
        if (rawCreds) {
          try {
            const parsed = JSON.parse(rawCreds);
            if (Array.isArray(parsed)) {
              for (const item of parsed) {
                if (item?.apiKey && typeof item.apiKey === "string" && !item.apiKey.includes("***")) {
                  realKeys.push(item.apiKey.trim());
                }
              }
            }
          } catch {}
        }
        const legacyKeys = await kv.get(KV_CUSTOM_KEYS_PREFIX + dupId);
        if (legacyKeys) {
          for (const k of legacyKeys.split(",")) {
            const trimmed = k.trim();
            if (trimmed && !trimmed.includes("***")) {
              realKeys.push(trimmed);
            }
          }
        }
      }

      // Adicionar chaves de dupProv.apiKeys se não forem mascaradas
      for (const k of (dupProv.apiKeys || [])) {
        const trimmed = (k || "").trim();
        if (trimmed && !trimmed.includes("***")) {
          realKeys.push(trimmed);
        }
      }

      realKeys = Array.from(new Set(realKeys));

      // Se encontramos chaves reais, salvamos no provedor canônico
      if (realKeys.length > 0) {
        if (kv) {
          // Salvar diretamente no KV sem chamar mutateAdminConfig (para evitar recursão)
          const existingRaw = await kv.get("credentials_" + canonicalId);
          let existingCreds: ProviderCredential[] = [];
          if (existingRaw) {
            try {
              const parsed = JSON.parse(existingRaw);
              if (Array.isArray(parsed)) existingCreds = parsed;
            } catch {}
          }
          const mergedCreds = Array.from(
            new Map(
              [...existingCreds, ...realKeys.map((k) => ({ apiKey: k }))]
                .filter((item) => item && item.apiKey && !item.apiKey.includes("***"))
                .map((item) => [item.apiKey, item])
            ).values()
          );
          await Promise.all([
            kv.put("credentials_" + canonicalId, JSON.stringify(mergedCreds)),
            kv.put(KV_CUSTOM_KEYS_PREFIX + canonicalId, mergedCreds.map((c) => c.apiKey).join(",")),
          ]);
        } else {
          inMemoryCredentials[canonicalId] = Array.from(
            new Map(
              [...(inMemoryCredentials[canonicalId] || []), ...realKeys.map((k) => ({ apiKey: k }))]
                .filter((item) => item && item.apiKey && !item.apiKey.includes("***"))
                .map((item) => [item.apiKey, item])
            ).values()
          );
        }
        if (cfg.customProviders[canonicalId]) {
          const cur = cfg.customProviders[canonicalId].apiKeys || [];
          cfg.customProviders[canonicalId].apiKeys = Array.from(new Set([...cur, ...realKeys]));
        }
      }

      // b) Mesclar modelos de customModels se existirem
      const dupModels = dupProv.models || [];
      const dupCustomModels = cfg.customModels[dupId] || [];
      const combinedModels = Array.from(new Set([...dupModels, ...dupCustomModels]));
      if (combinedModels.length > 0) {
        cfg.customModels[canonicalId] = Array.from(
          new Set([...(cfg.customModels[canonicalId] || []), ...combinedModels])
        );
      }

      // c) Mesclar providerStates
      if (cfg.providerStates[dupId]) {
        if (!cfg.providerStates[canonicalId]) {
          cfg.providerStates[canonicalId] = cfg.providerStates[dupId];
        }
        delete cfg.providerStates[dupId];
      }

      // d) Limpar chaves da duplicata no KV
      if (kv) {
        try {
          await Promise.all([
            kv.delete("credentials_" + dupId),
            kv.delete(KV_CUSTOM_KEYS_PREFIX + dupId),
          ]);
        } catch { /* best effort */ }
      }

      delete cfg.customProviders[dupId];
      delete cfg.customModels[dupId];
      delete cfg.removedModels[dupId];
      modified = true;
    }
  }

  // 2. Limpar modelos redundantes de customModels
  for (const [pId, models] of Object.entries(cfg.customModels || {})) {
    const canonicalId = normalizeProviderId(pId);
    if (canonicalId !== pId) {
      cfg.customModels[canonicalId] = Array.from(
        new Set([...(cfg.customModels[canonicalId] || []), ...models])
      );
      delete cfg.customModels[pId];
      modified = true;
    }

    const targetId = canonicalId;
    const currentModels = cfg.customModels[targetId] || [];
    const staticModels = new Set([
      ...(getStaticCatalog(targetId) || []),
      ...(PROVIDER_REGISTRY[targetId]?.models || []),
    ]);

    // Filtrar os modelos que já estão no catálogo estático
    const cleaned = currentModels.filter((m) => !staticModels.has(m));
    const uniqueCleaned = Array.from(new Set(cleaned));

    if (uniqueCleaned.length === 0) {
      delete cfg.customModels[targetId];
      modified = true;
    } else if (uniqueCleaned.length !== currentModels.length) {
      cfg.customModels[targetId] = uniqueCleaned;
      modified = true;
    }
  }

  // 3. Atualizar combos para usar provedores canônicos
  for (const combo of Object.values(cfg.combos || {})) {
    if (combo.targets && Array.isArray(combo.targets)) {
      for (const target of combo.targets) {
        const norm = normalizeProviderId(target.provider);
        if (norm !== target.provider) {
          target.provider = norm;
          modified = true;
        }
      }
    }
  }

  // 4. Limpar modelStates e removedModels de referências a IDs duplicados/alias
  //    Ex.: "groq-lpu-ultra-fast-inference/llama-3.3-70b-versatile" -> deletar
  for (const key of Object.keys(cfg.modelStates || {})) {
    const slashIdx = key.indexOf("/");
    if (slashIdx === -1) continue;
    const prefix = key.slice(0, slashIdx);
    const normalized = normalizeProviderId(prefix);
    if (normalized !== prefix) {
      // Migrar estado para a chave canônica, se ainda não existir
      const canonicalKey = normalized + key.slice(slashIdx);
      if (!cfg.modelStates[canonicalKey]) {
        cfg.modelStates[canonicalKey] = cfg.modelStates[key];
      }
      delete cfg.modelStates[key];
      modified = true;
    }
  }

  for (const dupId of Object.keys(cfg.removedModels || {})) {
    const normalized = normalizeProviderId(dupId);
    if (normalized !== dupId) {
      // Migrar modelos removidos para o provedor canônico
      const existingRemoved = cfg.removedModels[normalized] || [];
      cfg.removedModels[normalized] = Array.from(
        new Set([...existingRemoved, ...(cfg.removedModels[dupId] || [])])
      );
      delete cfg.removedModels[dupId];
      modified = true;
    }
  }

  cfg.version = 3;
  return true;
}

export async function getAdminConfig(env: EnvBindings): Promise<AdminConfig> {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL_MS) return cloneConfig(cache.data);

  const kv = env.OMNI_KEYS;
  if (!kv) {
    const def = cloneConfig(DEFAULT_ADMIN_CONFIG);
    cache = { data: def, ts: now };
    return cloneConfig(def);
  }

  try {
    const raw = await kv.get(KV_ADMIN_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<AdminConfig>;
      const merged: AdminConfig = {
        ...DEFAULT_ADMIN_CONFIG,
        ...p,
        _seq: p._seq ?? 0,
        _deletedDefaultCombos: p._deletedDefaultCombos ?? [],
        searchConfig: { ...DEFAULT_ADMIN_CONFIG.searchConfig, ...(p.searchConfig ?? {}) },
        virtualKeys: { ...(p.virtualKeys ?? {}) },
        providerStates: { ...(p.providerStates ?? {}) },
        customProviders: { ...(p.customProviders ?? {}) },
        modelStates: { ...(p.modelStates ?? {}) },
        customModels: { ...(p.customModels ?? {}) },
        removedModels: { ...(p.removedModels ?? {}) },
        combos: mergeComos(p),
        antigravityConfig: p.antigravityConfig,
        providerBaseUrls: { ...(p.providerBaseUrls ?? {}) },
      };

      if (!p.version || p.version < 3) {
        try {
          const migrated = await migrateAdminConfigToV2(env, merged);
          if (migrated && kv) {
            await kv.put(KV_ADMIN_KEY, JSON.stringify(merged));
          }
        } catch (mErr) {
          console.error("[VeroRoute Store] Erro durante migrateAdminConfigToV2:", mErr);
        }
      }

      cache = { data: merged, ts: now };
      return cloneConfig(merged);
    }
  } catch {
    // corrupted JSON — fall through to default
  }

  const def = cloneConfig(DEFAULT_ADMIN_CONFIG);
  cache = { data: def, ts: now };
  return cloneConfig(def);
}

export async function saveAdminConfig(env: EnvBindings, cfg: AdminConfig): Promise<void> {
  const kv = env.OMNI_KEYS;
  if (kv) await kv.put(KV_ADMIN_KEY, JSON.stringify(cfg));
  cache = { data: cloneConfig(cfg), ts: Date.now() };
}

/**
 * Optimistic-concurrency mutate — A-6.
 * Reads freshly, checks _seq hasn't changed, retries on conflict.
 * KV has no native CAS but this covers the common low-contention case.
 */
export async function mutateAdminConfig(
  env: EnvBindings,
  mutator: (cfg: AdminConfig) => void,
  maxRetries = 3
): Promise<AdminConfig> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    invalidateCache();
    const cfg = await getAdminConfig(env);
    const seqBefore = cfg._seq;
    cfg._seq = seqBefore + 1;
    mutator(cfg);

    // Verify no concurrent write snuck in
    if (env.OMNI_KEYS && attempt < maxRetries) {
      const check = await env.OMNI_KEYS.get(KV_ADMIN_KEY);
      if (check) {
        try {
          const onDisk = (JSON.parse(check) as Partial<AdminConfig>)._seq ?? 0;
          if (onDisk !== seqBefore) continue; // retry
        } catch { /* corrupted, proceed */ }
      }
    }

    await saveAdminConfig(env, cfg);
    return cfg;
  }
  // exhausted retries — write anyway (best-effort)
  invalidateCache();
  const cfg = await getAdminConfig(env);
  cfg._seq = (cfg._seq ?? 0) + 1;
  mutator(cfg);
  await saveAdminConfig(env, cfg);
  return cfg;
}

/**
 * Delete a combo — A-5.
 * Records default combo IDs in the blacklist so they are not resurrected.
 */
export async function deleteCombo(env: EnvBindings, comboId: string): Promise<void> {
  await mutateAdminConfig(env, (cfg) => {
    if (DEFAULT_COMBOS[comboId] !== undefined && !cfg._deletedDefaultCombos.includes(comboId)) {
      cfg._deletedDefaultCombos.push(comboId);
    }
    delete cfg.combos[comboId];
  });
}

export async function getAntigravityOAuthCredentials(
  env: EnvBindings
): Promise<{ clientId: string; clientSecret: string; isConfigured: boolean }> {
  const cfg = await getAdminConfig(env);
  const fromKv = cfg.antigravityConfig;
  
  // 1. Try KV
  // 2. Try Env vars
  // 3. Fallback to embedded credentials
  const clientId =
    fromKv?.clientId?.trim() ||
    (typeof env.ANTIGRAVITY_CLIENT_ID === "string" ? env.ANTIGRAVITY_CLIENT_ID.trim() : "") ||
    ANTIGRAVITY_PUBLIC_CONFIG.clientId;
    
  const clientSecret =
    fromKv?.clientSecret?.trim() ||
    (typeof env.ANTIGRAVITY_CLIENT_SECRET === "string" ? env.ANTIGRAVITY_CLIENT_SECRET.trim() : "") ||
    ANTIGRAVITY_PUBLIC_CONFIG.clientSecret;
    
  const isConfigured = Boolean(clientId && clientSecret);
  return { clientId, clientSecret, isConfigured };
}

export function slugifyProviderId(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "provider";
}

const inMemoryCredentials: Record<string, ProviderCredential[]> = {};

export async function getStoredProviderCredentials(env: EnvBindings, providerId: string): Promise<ProviderCredential[]> {
  providerId = normalizeProviderId(providerId);
  const kv = env.OMNI_KEYS;
  if (!kv) return inMemoryCredentials[providerId] || [];
  const raw = await kv.get("credentials_" + providerId);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as ProviderCredential[];
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item) => item && typeof item.apiKey === "string" && item.apiKey.trim())
          .map((item) => ({ apiKey: item.apiKey.trim() }));
      }
    } catch { /* fall back to legacy storage */ }
  }
  const legacy = await kv.get(KV_CUSTOM_KEYS_PREFIX + providerId);
  return (legacy || "").split(",").map((apiKey) => apiKey.trim()).filter(Boolean).map((apiKey) => ({ apiKey }));
}

export async function setStoredProviderCredentials(
  env: EnvBindings,
  providerId: string,
  credentials: ProviderCredential[]
): Promise<void> {
  providerId = normalizeProviderId(providerId);
  const kv = env.OMNI_KEYS;
  const clean = credentials
    .map((item) => ({ apiKey: item.apiKey.trim() }))
    .filter((item) => item.apiKey);
  const unique = Array.from(new Map(clean.map((item) => [item.apiKey, item])).values());
  if (!kv) {
    inMemoryCredentials[providerId] = unique;
  } else if (unique.length === 0) {
    // Limpar todas as chaves: apagar do KV + zerar cache em memória imediatamente
    inMemoryCredentials[providerId] = [];
    await Promise.all([kv.delete("credentials_" + providerId), kv.delete(KV_CUSTOM_KEYS_PREFIX + providerId)]);
  } else {
    inMemoryCredentials[providerId] = unique;
    await Promise.all([
      kv.put("credentials_" + providerId, JSON.stringify(unique)),
      kv.put(KV_CUSTOM_KEYS_PREFIX + providerId, Array.from(new Set(unique.map((item) => item.apiKey))).join(",")),
    ]);
  }
  // Sincroniza apiKeys em customProviders apenas se necessário.
  // Provedores nativos (PROVIDER_REGISTRY) não têm entrada em customProviders,
  // então o mutateAdminConfig seria um no-op oneroso (~40ms de leitura+escrita no KV).
  // Verificamos o cache em memória antes de decidir — sem I/O extra.
  const isCustomProvider = Boolean(cache?.data?.customProviders?.[providerId]);
  if (isCustomProvider) {
    await mutateAdminConfig(env, (cfg) => {
      if (cfg.customProviders[providerId]) cfg.customProviders[providerId].apiKeys = unique.map((item) => item.apiKey);
    });
  } else {
    // Para provedores nativos, invalidar o cache de adminConfig para forçar releitura
    // e garantir que a UI reflita a mudança imediatamente (sem esperar TTL de 5s)
    invalidateCache();
  }
}

export async function getCustomProviderKeys(env: EnvBindings, providerId: string): Promise<string[]> {
  return (await getStoredProviderCredentials(env, providerId)).map((item) => item.apiKey);
}

export async function setCustomProviderKeys(env: EnvBindings, providerId: string, keys: string[]): Promise<void> {
  await setStoredProviderCredentials(env, providerId, keys.map((apiKey) => ({ apiKey })));
}

export async function appendProviderCredentials(
  env: EnvBindings,
  providerId: string,
  newCredentials: ProviderCredential[]
): Promise<ProviderCredential[]> {
  providerId = normalizeProviderId(providerId);
  const existing = await getStoredProviderCredentials(env, providerId);
  const merged = Array.from(new Map([...existing, ...newCredentials]
    .map((item) => ({ apiKey: item.apiKey.trim() }))
    .filter((item) => item.apiKey)
    .map((item) => [item.apiKey, item])).values());
  await setStoredProviderCredentials(env, providerId, merged);
  return merged;
}

export async function appendProviderKeys(env: EnvBindings, providerId: string, newKeys: string[]): Promise<string[]> {
  return (await appendProviderCredentials(env, providerId, newKeys.map((apiKey) => ({ apiKey })))).map((item) => item.apiKey);
}

export async function removeProviderKeys(env: EnvBindings, providerId: string, keysToRemove: string[]): Promise<string[]> {
  providerId = normalizeProviderId(providerId);
  const removeSet = new Set(keysToRemove.map((key) => key.trim()));
  const remaining = (await getStoredProviderCredentials(env, providerId)).filter((item) => !removeSet.has(item.apiKey));
  await setStoredProviderCredentials(env, providerId, remaining);
  return remaining.map((item) => item.apiKey);
}

export async function setProviderBaseUrl(
  env: EnvBindings,
  providerId: string,
  baseUrl?: string
): Promise<AdminConfig> {
  return mutateAdminConfig(env, (cfg) => {
    if (!cfg.providerBaseUrls) cfg.providerBaseUrls = {};
    const trimmed = (baseUrl || "").trim();
    if (trimmed) {
      cfg.providerBaseUrls[providerId] = trimmed;
    } else {
      delete cfg.providerBaseUrls[providerId];
    }
    if (cfg.customProviders[providerId] && trimmed) {
      cfg.customProviders[providerId].baseUrl = trimmed;
    }
  });
}

