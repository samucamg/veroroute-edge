import type { EnvBindings } from "@/types/provider";
import type { ProviderCredential } from "@/routing/proxy";

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
  activeProvider: "auto" | "searxng" | "duckduckgo" | "tavily" | "serper" | "brave";
  searxngUrl?: string;
  tavilyApiKey?: string;
  serperApiKey?: string;
  braveApiKey?: string;
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
}

// ---------------------------------------------------------------------------
// Built-in default combos
// ---------------------------------------------------------------------------
const DEFAULT_COMBOS: Record<string, ComboConfig> = {
  "omni-free": {
    id: "omni-free",
    name: "Omni Free Tier",
    description: "Cascata otimizada de provedores gratuitos de alta qualidade",
    strategy: "priority",
    targets: [
      { provider: "gemini", model: "gemini-2.0-flash", priority: 1 },
      { provider: "cloudflare-ai", model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", priority: 2 },
      { provider: "groq", model: "llama-3.3-70b-versatile", priority: 3 },
    ],
    enabled: true,
  },
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

// Expose for use in cascade/routes without importing the whole store
export { DEFAULT_COMBOS };

const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  version: 1,
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
  const base: Record<string, ComboConfig> = {};
  for (const [id, cfg] of Object.entries(DEFAULT_COMBOS)) {
    if (!deleted.has(id)) base[id] = cfg;
  }
  return { ...base, ...(p.combos ?? {}) };
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
      };
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
  const clientId =
    fromKv?.clientId?.trim() ||
    (typeof env.ANTIGRAVITY_CLIENT_ID === "string" ? env.ANTIGRAVITY_CLIENT_ID.trim() : "");
  const clientSecret =
    fromKv?.clientSecret?.trim() ||
    (typeof env.ANTIGRAVITY_CLIENT_SECRET === "string" ? env.ANTIGRAVITY_CLIENT_SECRET.trim() : "");
  const isConfigured = Boolean(
    clientId && clientSecret &&
    clientId !== "YOUR_GOOGLE_CLIENT_ID_HERE" &&
    clientSecret !== "YOUR_GOOGLE_CLIENT_SECRET_HERE"
  );
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

export async function getStoredProviderCredentials(env: EnvBindings, providerId: string): Promise<ProviderCredential[]> {
  const kv = env.OMNI_KEYS;
  if (!kv) return [];
  const raw = await kv.get("credentials_" + providerId);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as ProviderCredential[];
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item) => item && typeof item.apiKey === "string" && item.apiKey.trim())
          .map((item) => ({ apiKey: item.apiKey.trim(), proxyUrl: item.proxyUrl?.trim() || undefined }));
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
  const kv = env.OMNI_KEYS;
  if (!kv) return;
  const clean = credentials
    .map((item) => ({ apiKey: item.apiKey.trim(), proxyUrl: item.proxyUrl?.trim() || undefined }))
    .filter((item) => item.apiKey);
  const unique = Array.from(new Map(clean.map((item) => [item.apiKey + "\n" + (item.proxyUrl || ""), item])).values());
  if (unique.length === 0) {
    await Promise.all([kv.delete("credentials_" + providerId), kv.delete(KV_CUSTOM_KEYS_PREFIX + providerId)]);
  } else {
    await Promise.all([
      kv.put("credentials_" + providerId, JSON.stringify(unique)),
      kv.put(KV_CUSTOM_KEYS_PREFIX + providerId, Array.from(new Set(unique.map((item) => item.apiKey))).join(",")),
    ]);
  }
  await mutateAdminConfig(env, (cfg) => {
    if (cfg.customProviders[providerId]) cfg.customProviders[providerId].apiKeys = unique.map((item) => item.apiKey);
  });
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
  const existing = await getStoredProviderCredentials(env, providerId);
  const merged = Array.from(new Map([...existing, ...newCredentials]
    .map((item) => ({ apiKey: item.apiKey.trim(), proxyUrl: item.proxyUrl?.trim() || undefined }))
    .filter((item) => item.apiKey)
    .map((item) => [item.apiKey + "\n" + (item.proxyUrl || ""), item])).values());
  await setStoredProviderCredentials(env, providerId, merged);
  return merged;
}

export async function appendProviderKeys(env: EnvBindings, providerId: string, newKeys: string[]): Promise<string[]> {
  return (await appendProviderCredentials(env, providerId, newKeys.map((apiKey) => ({ apiKey })))).map((item) => item.apiKey);
}

export async function removeProviderKeys(env: EnvBindings, providerId: string, keysToRemove: string[]): Promise<string[]> {
  const removeSet = new Set(keysToRemove.map((key) => key.trim()));
  const remaining = (await getStoredProviderCredentials(env, providerId)).filter((item) => !removeSet.has(item.apiKey));
  await setStoredProviderCredentials(env, providerId, remaining);
  return remaining.map((item) => item.apiKey);
}
