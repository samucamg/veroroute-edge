import type { EnvBindings } from "@/types/provider";

// Cache em memória LOCAL por isolate — serve como tier-1 (hot) cache
// FIX 5: cooldowns também são persistidos no Cloudflare KV (OMNI_CACHE) para
// que isolates em PoPs diferentes (SP, Ashburn, Frankfurt...) compartilhem o
// estado de rate-limit. Isso evita que uma chave bloqueada por 429 num isolate
// continue sendo usada por outro isolate que não tem a informação em memória.
const keyRotationIndex: Record<string, number> = {};
const keyCooldowns: Map<string, number> = new Map();

/** Prefixo de chave no KV para cooldowns de API keys */
const KV_COOLDOWN_PREFIX = "cooldown:";

/**
 * Retorna a lista de chaves de API disponíveis para um determinado provedor
 */
export async function getProviderKeys(env: EnvBindings, providerId: string): Promise<string[]> {
  const envKeyMap: Record<string, string | undefined> = {
    openai: env.OPENAI_API_KEYS,
    azure: env.AZURE_OPENAI_API_KEYS,
    bedrock: env.BEDROCK_API_KEYS,
    alibaba: env.ALIBABA_API_KEYS,
    "1min": env.ONE_MIN_API_KEYS,
    freeapikey: env.FREEAPIKEY_KEYS,
    gemini: env.GEMINI_API_KEYS,
    groq: env.GROQ_API_KEYS,
    cerebras: env.CEREBRAS_API_KEYS,
    sambanova: env.SAMBANOVA_API_KEYS,
    mistral: env.MISTRAL_API_KEYS,
    openrouter: env.OPENROUTER_API_KEYS,
    deepseek: env.DEEPSEEK_API_KEYS,
    pollinations: env.POLLINATIONS_API_KEYS,
    tavily: env.TAVILY_API_KEYS,
    serper: env.SERPER_API_KEYS,
    firecrawl: env.FIRECRAWL_API_KEYS,
  };
  const rawKeys = envKeyMap[providerId] || "";
  let keys = rawKeys
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
  // Se houver KV configurado, tenta buscar chaves adicionais salvas
  if (env.OMNI_KEYS) {
    const kvKeys = await env.OMNI_KEYS.get("keys_" + providerId);
    if (kvKeys) {
      const extra = kvKeys
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
      keys = Array.from(new Set([...keys, ...extra]));
    }
  }
  return keys;
}

/**
 * FIX 5: Verifica se uma chave está em cooldown, consultando primeiro o cache
 * local em memória e depois o Cloudflare KV (para detectar cooldowns registrados
 * por outros isolates na mesma edge network).
 */
async function isKeyCooledDown(env: EnvBindings, apiKey: string): Promise<boolean> {
  const now = Date.now();
  // Tier-1: memória local
  const localExpiry = keyCooldowns.get(apiKey);
  if (localExpiry !== undefined) {
    if (now < localExpiry) return true;
    keyCooldowns.delete(apiKey);
  }
  // Tier-2: Cloudflare KV (compartilhado entre isolates globalmente)
  if (env.OMNI_CACHE) {
    const kvVal = await env.OMNI_CACHE.get(KV_COOLDOWN_PREFIX + apiKey);
    if (kvVal) {
      const kvExpiry = parseInt(kvVal, 10);
      if (!isNaN(kvExpiry) && now < kvExpiry) {
        // Popula o cache local para evitar round-trips futuros no mesmo isolate
        keyCooldowns.set(apiKey, kvExpiry);
        return true;
      }
    }
  }
  return false;
}

/**
 * Seleciona a próxima chave válida (Round-Robin) ignorando as em cooldown (429/rate-limit)
 */
export async function selectActiveKey(env: EnvBindings, providerId: string): Promise<string> {
  const keys = await getProviderKeys(env, providerId);
  if (keys.length === 0) {
    return ""; // Provedores keyless como pollinations ou cloudflare-ai nativo
  }
  const now = Date.now();
  if (!keyRotationIndex[providerId]) keyRotationIndex[providerId] = 0;
  // Tenta cada chave começando pelo índice atual de round-robin
  for (let i = 0; i < keys.length; i++) {
    const idx = (keyRotationIndex[providerId] + i) % keys.length;
    const key = keys[idx];
    const cooledDown = await isKeyCooledDown(env, key);
    if (!cooledDown) {
      keyRotationIndex[providerId] = (idx + 1) % keys.length;
      return key;
    }
  }
  // Todas as chaves em cooldown — retorna a primeira mesmo assim para evitar falha total
  console.warn("[VeroRoute KeyPool] Todas as chaves do provedor " + providerId + " estão em cooldown. Usando a primeira.");
  return keys[0];
}

/**
 * FIX 5: Marca uma chave API como em rate-limit com TTL tanto no cache local
 * quanto no Cloudflare KV, para sincronização global entre isolates.
 *
 * @param env         Bindings do Cloudflare Workers (contém OMNI_CACHE)
 * @param apiKey      A chave que recebeu HTTP 429
 * @param cooldownSec Segundos de cooldown (padrão: 60)
 */
export async function markKeyRateLimited(
  env: EnvBindings,
  apiKey: string,
  cooldownSec = 60
): Promise<void> {
  const expiryMs = Date.now() + cooldownSec * 1000;
  // Cache local imediato
  keyCooldowns.set(apiKey, expiryMs);
  // Persiste no KV com TTL para compartilhar entre todos os isolates
  if (env.OMNI_CACHE) {
    await env.OMNI_CACHE.put(
      KV_COOLDOWN_PREFIX + apiKey,
      String(expiryMs),
      { expirationTtl: cooldownSec + 10 } // +10s de margem de segurança
    );
  }
}

