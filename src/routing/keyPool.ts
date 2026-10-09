import type { EnvBindings } from "@/types/provider";
import { getStoredProviderCredentials } from "@/admin/store";
import type { ProviderCredential } from "@/admin/store";
import { normalizeProviderId } from "@/config/providerAliases";

const keyRotationIndex: Record<string, number> = {};
const keyCooldowns: Map<string, number> = new Map();
const KV_COOLDOWN_PREFIX = "cooldown:";

function environmentCredentials(env: EnvBindings, providerId: string): ProviderCredential[] {
  const normId = normalizeProviderId(providerId);
  const e = env as any;
  const envKeyMap: Record<string, string | undefined> = {
    openai: env.OPENAI_API_KEYS || e.OPENAI_API_KEY,
    azure: env.AZURE_OPENAI_API_KEYS || e.AZURE_OPENAI_API_KEY,
    bedrock: env.BEDROCK_API_KEYS || e.BEDROCK_API_KEY || e.AWS_BEARER_TOKEN,
    alibaba: env.ALIBABA_API_KEYS || e.ALIBABA_API_KEY || e.DASHSCOPE_API_KEY,
    "1min": env.ONE_MIN_API_KEYS || e.ONE_MIN_API_KEY || e["1MIN_API_KEY"],
    freeapikey: env.FREEAPIKEY_KEYS || e.FREEAPIKEY_KEY,
    gemini: env.GEMINI_API_KEYS || e.GEMINI_API_KEY,
    groq: env.GROQ_API_KEYS || e.GROQ_API_KEY,
    cerebras: env.CEREBRAS_API_KEYS || e.CEREBRAS_API_KEY,
    sambanova: env.SAMBANOVA_API_KEYS || e.SAMBANOVA_API_KEY,
    mistral: env.MISTRAL_API_KEYS || e.MISTRAL_API_KEY,
    openrouter: env.OPENROUTER_API_KEYS || e.OPENROUTER_API_KEY,
    deepseek: env.DEEPSEEK_API_KEYS || e.DEEPSEEK_API_KEY,
    pollinations: env.POLLINATIONS_API_KEYS || e.POLLINATIONS_API_KEY,
    tavily: env.TAVILY_API_KEYS || e.TAVILY_API_KEY,
    serper: env.SERPER_API_KEYS || e.SERPER_API_KEY,
    firecrawl: env.FIRECRAWL_API_KEYS || env.FIRECRAWL_API_KEY,
    nvidia: e.NVIDIA_API_KEYS || e.NVIDIA_API_KEY,
  };

  let raw = envKeyMap[normId] || envKeyMap[providerId];
  if (!raw) {
    const cleanId = normId.toUpperCase().replace(/[^A-Z0-9]/g, "_");
    raw = e[cleanId + "_API_KEYS"] || e[cleanId + "_API_KEY"] || e[cleanId + "_KEY"];
  }

  return (raw || "").split(",").map((apiKey) => apiKey.trim()).filter(Boolean).map((apiKey) => ({ apiKey }));
}

export async function getProviderCredentials(env: EnvBindings, providerId: string): Promise<ProviderCredential[]> {
  providerId = normalizeProviderId(providerId);
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
  providerId = normalizeProviderId(providerId);
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

// ---------------------------------------------------------------------------
// Bloqueio por (chave, modelo): um 404 "modelo indisponível" vale só para o par.
// Ex.: projetos novos do Gemini não têm gemini-2.5-flash, projetos antigos têm.
// ---------------------------------------------------------------------------
const KV_MODEL_BLOCK_PREFIX = "cooldown_model:";
const keyModelBlocks: Map<string, number> = new Map();

async function keyModelId(apiKey: string, model: string): Promise<string> {
  const data = new TextEncoder().encode(apiKey);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  const hex = Array.from(digest.slice(0, 12)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex + ":" + model;
}

export async function markKeyModelUnavailable(env: EnvBindings, apiKey: string, model: string, cooldownSec: number): Promise<void> {
  const id = await keyModelId(apiKey, model);
  const expiryMs = Date.now() + cooldownSec * 1000;
  keyModelBlocks.set(id, expiryMs);
  if (env.OMNI_CACHE) {
    await env.OMNI_CACHE.put(KV_MODEL_BLOCK_PREFIX + id, String(expiryMs), { expirationTtl: Math.max(60, cooldownSec + 10) });
  }
}

async function isKeyModelBlocked(env: EnvBindings, apiKey: string, model: string): Promise<boolean> {
  const id = await keyModelId(apiKey, model);
  const now = Date.now();
  const local = keyModelBlocks.get(id);
  if (local !== undefined) {
    if (now < local) return true;
    keyModelBlocks.delete(id);
  }
  if (env.OMNI_CACHE) {
    const kvVal = await env.OMNI_CACHE.get(KV_MODEL_BLOCK_PREFIX + id);
    const expiry = kvVal ? parseInt(kvVal, 10) : NaN;
    if (!isNaN(expiry) && now < expiry) {
      keyModelBlocks.set(id, expiry);
      return true;
    }
  }
  return false;
}

/**
 * Escolhe a credencial para UMA tentativa da cascata.
 * Pula chaves já tentadas nesta requisição, em cooldown ou bloqueadas para o modelo.
 * Retorna null quando não há mais chave utilizável: a cascata passa ao próximo candidato
 * em vez de insistir numa chave sabidamente esgotada (o comportamento antigo era usar a
 * primeira chave mesmo em cooldown).
 * Provedores sem chave (pollinations, cloudflare-ai, env-only) recebem { apiKey: "" } uma vez.
 */
export async function selectCredentialForAttempt(
  env: EnvBindings,
  providerId: string,
  model: string,
  tried: Set<string>
): Promise<ProviderCredential | null> {
  providerId = normalizeProviderId(providerId);
  const entries = await getProviderCredentials(env, providerId);
  if (entries.length === 0) return tried.has("") ? null : { apiKey: "" };

  if (!keyRotationIndex[providerId]) keyRotationIndex[providerId] = 0;
  for (let i = 0; i < entries.length; i++) {
    const idx = (keyRotationIndex[providerId] + i) % entries.length;
    const entry = entries[idx];
    if (tried.has(entry.apiKey)) continue;
    if (await isKeyCooledDown(env, entry.apiKey)) continue;
    if (await isKeyModelBlocked(env, entry.apiKey, model)) continue;
    keyRotationIndex[providerId] = (idx + 1) % entries.length;
    return entry;
  }
  return null;
}

/** Somente para testes: limpa o estado em memória do pool. */
export function __resetKeyPoolStateForTests(): void {
  for (const k of Object.keys(keyRotationIndex)) delete keyRotationIndex[k];
  keyCooldowns.clear();
  keyModelBlocks.clear();
}
