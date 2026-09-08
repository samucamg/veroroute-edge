import type { EnvBindings } from "@/types/provider";
import { getStoredProviderCredentials } from "@/admin/store";
import type { ProviderCredential } from "@/admin/store";

const keyRotationIndex: Record<string, number> = {};
const keyCooldowns: Map<string, number> = new Map();
const KV_COOLDOWN_PREFIX = "cooldown:";

function environmentCredentials(env: EnvBindings, providerId: string): ProviderCredential[] {
  const envKeyMap: Record<string, string | undefined> = {
    openai: env.OPENAI_API_KEYS, azure: env.AZURE_OPENAI_API_KEYS, bedrock: env.BEDROCK_API_KEYS,
    alibaba: env.ALIBABA_API_KEYS, "1min": env.ONE_MIN_API_KEYS, freeapikey: env.FREEAPIKEY_KEYS,
    gemini: env.GEMINI_API_KEYS, groq: env.GROQ_API_KEYS, cerebras: env.CEREBRAS_API_KEYS,
    sambanova: env.SAMBANOVA_API_KEYS, mistral: env.MISTRAL_API_KEYS, openrouter: env.OPENROUTER_API_KEYS,
    deepseek: env.DEEPSEEK_API_KEYS, pollinations: env.POLLINATIONS_API_KEYS, tavily: env.TAVILY_API_KEYS,
    serper: env.SERPER_API_KEYS, firecrawl: env.FIRECRAWL_API_KEYS,
  };
  return (envKeyMap[providerId] || "").split(",").map((apiKey) => apiKey.trim()).filter(Boolean).map((apiKey) => ({ apiKey }));
}

export async function getProviderCredentials(env: EnvBindings, providerId: string): Promise<ProviderCredential[]> {
  const all = [...environmentCredentials(env, providerId), ...await getStoredProviderCredentials(env, providerId)];
  const seen = new Set<string>();
  return all.filter((entry) => {
    const id = entry.apiKey;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export async function getProviderKeys(env: EnvBindings, providerId: string): Promise<string[]> {
  return (await getProviderCredentials(env, providerId)).map((entry) => entry.apiKey);
}

async function isKeyCooledDown(env: EnvBindings, apiKey: string): Promise<boolean> {
  const now = Date.now();
  const localExpiry = keyCooldowns.get(apiKey);
  if (localExpiry !== undefined) {
    if (now < localExpiry) return true;
    keyCooldowns.delete(apiKey);
  }
  if (env.OMNI_CACHE) {
    const kvVal = await env.OMNI_CACHE.get(KV_COOLDOWN_PREFIX + apiKey);
    if (kvVal) {
      const kvExpiry = parseInt(kvVal, 10);
      if (!isNaN(kvExpiry) && now < kvExpiry) {
        keyCooldowns.set(apiKey, kvExpiry);
        return true;
      }
    }
  }
  return false;
}

export async function selectActiveCredential(env: EnvBindings, providerId: string): Promise<ProviderCredential> {
  const entries = await getProviderCredentials(env, providerId);
  if (entries.length === 0) return { apiKey: "" };
  if (!keyRotationIndex[providerId]) keyRotationIndex[providerId] = 0;
  for (let i = 0; i < entries.length; i++) {
    const idx = (keyRotationIndex[providerId] + i) % entries.length;
    if (!await isKeyCooledDown(env, entries[idx].apiKey)) {
      keyRotationIndex[providerId] = (idx + 1) % entries.length;
      return entries[idx];
    }
  }
  console.warn("[VeroRoute KeyPool] Todas as chaves do provedor " + providerId + " estão em cooldown. Usando a primeira.");
  return entries[0];
}

export async function selectActiveKey(env: EnvBindings, providerId: string): Promise<string> {
  return (await selectActiveCredential(env, providerId)).apiKey;
}

export async function markKeyRateLimited(env: EnvBindings, apiKey: string, cooldownSec = 60): Promise<void> {
  const expiryMs = Date.now() + cooldownSec * 1000;
  keyCooldowns.set(apiKey, expiryMs);
  if (env.OMNI_CACHE) await env.OMNI_CACHE.put(KV_COOLDOWN_PREFIX + apiKey, String(expiryMs), { expirationTtl: cooldownSec + 10 });
}
