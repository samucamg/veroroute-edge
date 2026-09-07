import type { EnvBindings } from "@/types/provider";

// =============================================================================
// Store Administrativo do VeroRoute Edge (persistido no Cloudflare KV OMNI_KEYS)
// =============================================================================
// Permite gerenciar dinamicamente:
//  - Habilitar / desabilitar provedores já existentes
//  - Adicionar / remover chaves de API para balanceamento (round-robin)
//  - Registrar provedores customizados compatíveis com OpenAI ou Anthropic
//  - Adicionar / excluir modelos do catálogo
// =============================================================================

export interface CustomProvider {
  id: string;                 // slug único (ex: "minha-empresa")
  name: string;               // nome de exibição
  baseUrl: string;            // URL base upstream
  apiKeys: string[];          // chaves para round-robin (separadas por vírgula na UI)
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
  id: string;               // ex: "sk-vr-..."
  name: string;             // ex: "Cursor IDE"
  createdAt: string;
  allowedModels: string[];   // ["*"] ou específicos
  rpmLimit?: number;
  totalRequests: number;
  lastUsedAt?: string;
  enabled: boolean;
}

export interface AdminConfig {
  version: number;
  // Habilitar/desabilitar provedores existentes: id -> { enabled }
  providerStates: Record<string, { enabled: boolean }>;
  // Provedores customizados (OpenAI/Anthropic-compatible)
  customProviders: Record<string, CustomProvider>;
  // Excluir modelos do catálogo: "provider/model-id" -> { enabled:false }
  modelStates: Record<string, { enabled: boolean }>;
  // Modelos adicionados a provedores existentes: providerId -> string[]
  customModels: Record<string, string[]>;
  // Configuração dinâmica de motores de busca
  searchConfig: AdminSearchConfig;
  // Chaves de API virtuais para clientes externos
  virtualKeys: Record<string, VirtualApiKey>;
}

const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  version: 1,
  providerStates: {},
  customProviders: {},
  modelStates: {},
  customModels: {},
  searchConfig: {
    activeProvider: "auto",
    searxngUrl: "",
    tavilyApiKey: "",
    serperApiKey: "",
    braveApiKey: "",
  },
  virtualKeys: {},
};

/** Chave principal no KV OMNI_KEYS onde o config admin é persistido */
const KV_ADMIN_KEY = "admin:config";
const KV_CUSTOM_KEYS_PREFIX = "keys_";

// Cache em memória por isolate + TTL curto para evitar round-trips no KV
const CACHE_TTL_MS = 5000;
let cache: { data: AdminConfig; ts: number } | null = null;

function cloneConfig(cfg: AdminConfig): AdminConfig {
  return JSON.parse(JSON.stringify(cfg));
}

/**
 * Carrega o AdminConfig do KV. Usa cache local com TTL de 5s para reduzir
 * round-trips ao Cloudflare KV sem sacrificar consistência.
 */
export async function getAdminConfig(env: EnvBindings): Promise<AdminConfig> {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL_MS) {
    return cloneConfig(cache.data);
  }

  const kv = env.OMNI_KEYS;
  if (!kv) return cloneConfig(DEFAULT_ADMIN_CONFIG);

  try {
    const raw = await kv.get(KV_ADMIN_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AdminConfig>;
      const merged: AdminConfig = {
        ...DEFAULT_ADMIN_CONFIG,
        ...parsed,
        searchConfig: { ...DEFAULT_ADMIN_CONFIG.searchConfig, ...(parsed.searchConfig || {}) },
        virtualKeys: { ...(parsed.virtualKeys || {}) },
        providerStates: { ...(parsed.providerStates || {}) },
        customProviders: { ...(parsed.customProviders || {}) },
        modelStates: { ...(parsed.modelStates || {}) },
        customModels: { ...(parsed.customModels || {}) },
      };
      cache = { data: merged, ts: now };
      return cloneConfig(merged);
    }
  } catch {
    // Se o JSON estiver corrompido, ignora e usa o default
  }

  cache = { data: DEFAULT_ADMIN_CONFIG, ts: now };
  return cloneConfig(DEFAULT_ADMIN_CONFIG);
}

/**
 * Persiste o AdminConfig no KV OMNI_KEYS e atualiza o cache local.
 */
export async function saveAdminConfig(env: EnvBindings, cfg: AdminConfig): Promise<void> {
  const kv = env.OMNI_KEYS;
  if (kv) {
    await kv.put(KV_ADMIN_KEY, JSON.stringify(cfg));
  }
  cache = { data: cloneConfig(cfg), ts: Date.now() };
}

/**
 * Efetua uma mutação atômica no AdminConfig (load -> mutate -> save).
 */
export async function mutateAdminConfig(
  env: EnvBindings,
  mutator: (cfg: AdminConfig) => void
): Promise<AdminConfig> {
  const cfg = await getAdminConfig(env);
  mutator(cfg);
  await saveAdminConfig(env, cfg);
  return cfg;
}

/** Sanitiza um id de provedor customizado para um slug seguro. */
export function slugifyProviderId(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "provider";
}

/** Lê as chaves de um provedor customizado diretamente do KV. */
export async function getCustomProviderKeys(env: EnvBindings, providerId: string): Promise<string[]> {
  const kv = env.OMNI_KEYS;
  if (!kv) return [];
  const raw = await kv.get(KV_CUSTOM_KEYS_PREFIX + providerId);
  if (!raw) return [];
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

/** Grava as chaves de um provedor customizado no KV (e atualiza o config). */
export async function setCustomProviderKeys(
  env: EnvBindings,
  providerId: string,
  keys: string[]
): Promise<void> {
  const kv = env.OMNI_KEYS;
  if (!kv) return;
  const clean = Array.from(new Set(keys.map((k) => k.trim()).filter(Boolean)));
  if (clean.length === 0) {
    await kv.delete(KV_CUSTOM_KEYS_PREFIX + providerId);
  } else {
    await kv.put(KV_CUSTOM_KEYS_PREFIX + providerId, clean.join(","));
  }
  // Sincroniza o config
  await mutateAdminConfig(env, (cfg) => {
    if (cfg.customProviders[providerId]) {
      cfg.customProviders[providerId].apiKeys = clean;
    }
  });
}

/** Adiciona chaves a um pool existente (balanceamento). */
export async function appendProviderKeys(
  env: EnvBindings,
  providerId: string,
  newKeys: string[]
): Promise<string[]> {
  const existing = await getCustomProviderKeys(env, providerId);
  const merged = Array.from(new Set([...existing, ...newKeys.map((k) => k.trim()).filter(Boolean)]));
  await setCustomProviderKeys(env, providerId, merged);
  return merged;
}

/** Remove chaves específicas de um pool. */
export async function removeProviderKeys(
  env: EnvBindings,
  providerId: string,
  keysToRemove: string[]
): Promise<string[]> {
  const existing = await getCustomProviderKeys(env, providerId);
  const remaining = existing.filter((k) => !keysToRemove.includes(k));
  await setCustomProviderKeys(env, providerId, remaining);
  return remaining;
}

export const ADMIN_CONSTANTS = { KV_ADMIN_KEY, KV_CUSTOM_KEYS_PREFIX };
