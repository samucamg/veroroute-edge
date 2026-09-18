/**
 * Registro Unificado de Modelos (Fonte Única de Verdade)
 *
 * Centraliza a definição, capacidades, metadados de preço e catálogos estáticos
 * de fallback para todos os provedores suportados pelo VeroRoute Edge.
 */

import { PROVIDER_REGISTRY } from "./providers";
import { normalizeProviderId } from "./providerAliases";
import type { AdminConfig } from "@/admin/store";

export interface ModelCapabilities {
  streaming?: boolean;
  tools?: boolean;
  vision?: boolean;
}

export interface ModelPricing {
  input_per_million: number;
  output_per_million: number;
  free_tier: boolean;
}

export interface ModelEntry {
  providerId: string;
  modelId: string;
  source: "upstream" | "static" | "custom";
  verifiedAt?: string;
  pricing?: ModelPricing;
  context_length?: number;
  capabilities?: ModelCapabilities;
  owned_by?: string;
}

// ---------------------------------------------------------------------------
// Catálogos Estáticos e Presets Canônicos por Provedor
// ---------------------------------------------------------------------------
export const STATIC_PROVIDER_CATALOGS: Record<string, string[]> = {
  "cloudflare-ai": [
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
  ],
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
  // 1min: removido do catálogo nativo — cadastrar como provedor customizado no painel admin
  gemini: [
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-thinking-preview",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "text-embedding-004",
    "aqa",
  ],
  azure: [
    "gpt-4o",
    "gpt-4o-mini",
    "o1",
    "o3-mini",
    "gpt-4-turbo",
    "gpt-35-turbo",
    "text-embedding-3-small",
    "text-embedding-3-large",
  ],
  bedrock: [
    "anthropic.claude-3-7-sonnet-20250219-v1:0",
    "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "anthropic.claude-3-5-haiku-20241022-v1:0",
    "anthropic.claude-3-haiku-20240307-v1:0",
    "meta.llama3-3-70b-instruct-v1:0",
    "meta.llama3-1-70b-instruct-v1:0",
    "meta.llama3-1-8b-instruct-v1:0",
    "amazon.nova-pro-v1:0",
    "amazon.nova-lite-v1:0",
    "amazon.nova-micro-v1:0",
    "mistral.mistral-large-2407-v1:0",
    "deepseek.r1-v1:0",
  ],
  openai: [
    "gpt-4o",
    "gpt-4o-mini",
    "o1",
    "o1-mini",
    "o3-mini",
    "chatgpt-4o-latest",
    "gpt-4-turbo",
  ],
  alibaba: [
    "qwen-max",
    "qwen-plus",
    "qwen-turbo",
    "qwen2.5-coder-32b-instruct",
    "qwen2.5-72b-instruct",
  ],
  groq: [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
  ],
  cerebras: [
    "llama3.3-70b",
    "llama3.1-8b",
    "gpt-oss-120b",
    "qwen-3.8-27b",
  ],
  sambanova: [
    "Meta-Llama-3.3-70B-Instruct",
    "Qwen2.5-72B-Instruct",
  ],
  openrouter: [
    "meta-llama/llama-3.3-70b-instruct:free",
    "deepseek/deepseek-r1:free",
    "deepseek/deepseek-v4.1-flash",
    "inclusionai/ling-3.0-flash-vl:free",
  ],
  deepseek: [
    "deepseek-chat",
    "deepseek-reasoner",
    "deepseek-flash",
    "deepseek-v4-pro",
  ],
  mistral: [
    "mistral-large-latest",
    "mistral-small-latest",
    "codestral-latest",
  ],
  pollinations: [
    "openai",
    "deepseek",
    "claude",
  ],
  nvidia: [
    "meta/llama-3.3-70b-instruct",
    "nvidia/llama-3.1-nemotron-70b-instruct",
  ],
};

// ---------------------------------------------------------------------------
// Dicionário de Metadados de Referência (Preços e Context Length)
// ---------------------------------------------------------------------------
const MODEL_METADATA: Record<string, Partial<ModelEntry>> = {
  "gpt-4o": {
    pricing: { input_per_million: 2.5, output_per_million: 10.0, free_tier: false },
    context_length: 128000,
    capabilities: { streaming: true, tools: true, vision: true },
  },
  "gpt-4o-mini": {
    pricing: { input_per_million: 0.15, output_per_million: 0.6, free_tier: false },
    context_length: 128000,
    capabilities: { streaming: true, tools: true, vision: true },
  },
  "o3-mini": {
    pricing: { input_per_million: 1.1, output_per_million: 4.4, free_tier: false },
    context_length: 200000,
    capabilities: { streaming: true, tools: true, vision: false },
  },
  "qwen-max": {
    pricing: { input_per_million: 0.2, output_per_million: 0.6, free_tier: true },
    context_length: 32768,
    capabilities: { streaming: true, tools: true, vision: true },
  },
  "qwen-plus": {
    pricing: { input_per_million: 0.1, output_per_million: 0.3, free_tier: true },
    context_length: 131072,
    capabilities: { streaming: true, tools: true, vision: true },
  },
  "gemini-2.5-flash": {
    pricing: { input_per_million: 0, output_per_million: 0, free_tier: true },
    context_length: 1048576,
    capabilities: { streaming: true, tools: true, vision: true },
  },
  "gemini-2.0-flash": {
    pricing: { input_per_million: 0, output_per_million: 0, free_tier: true },
    context_length: 1048576,
    capabilities: { streaming: true, tools: true, vision: true },
  },
  "gemini-2.5-pro": {
    pricing: { input_per_million: 1.25, output_per_million: 5.0, free_tier: true },
    context_length: 2097152,
    capabilities: { streaming: true, tools: true, vision: true },
  },
};

/**
 * Retorna o catálogo estático/preset de um provedor.
 */
export function getStaticCatalog(providerId: string): string[] {
  const norm = normalizeProviderId(providerId);
  return STATIC_PROVIDER_CATALOGS[norm] || STATIC_PROVIDER_CATALOGS[providerId] || [];
}

/**
 * Enriquece um modelo com metadados conhecidos (pricing, context length, capabilities).
 */
export function enrichModelMetadata(
  providerId: string,
  modelId: string,
  source: "upstream" | "static" | "custom" = "static",
  verifiedAt?: string
): ModelEntry {
  const provCfg = PROVIDER_REGISTRY[normalizeProviderId(providerId)];
  const cleanId = modelId.replace(new RegExp(`^${providerId}/`), "");
  const meta = MODEL_METADATA[cleanId] || MODEL_METADATA[modelId] || {};

  const pricing: ModelPricing = meta.pricing || {
    input_per_million: provCfg?.costPerMillionInput ?? 0,
    output_per_million: provCfg?.costPerMillionOutput ?? 0,
    free_tier: provCfg?.freeTier ?? true,
  };

  const capabilities: ModelCapabilities = meta.capabilities || {
    streaming: provCfg?.supportsStreaming ?? true,
    tools: provCfg?.supportsTools ?? true,
    vision: provCfg?.supportsVision ?? false,
  };

  return {
    providerId,
    modelId,
    source,
    verifiedAt,
    pricing,
    context_length: meta.context_length ?? 128000,
    capabilities,
    owned_by: provCfg?.name || providerId,
  };
}

/**
 * Retorna a lista completa consolidada de todos os modelos disponíveis no sistema,
 * respeitando estados do AdminConfig (provedores desabilitados, modelos desabilitados ou removidos).
 */
export function listAllAvailableModels(adminCfg?: AdminConfig): ModelEntry[] {
  const entries: ModelEntry[] = [];
  const seen = new Set<string>();

  const isProviderEnabled = (pId: string): boolean => {
    if (!adminCfg?.providerStates) return true;
    return adminCfg.providerStates[pId]?.enabled !== false;
  };

  const isModelEnabled = (pId: string, mId: string): boolean => {
    if (!adminCfg) return true;
    const key = `${pId}/${mId}`;
    if (adminCfg.modelStates?.[key]?.enabled === false) return false;
    if (adminCfg.modelStates?.[mId]?.enabled === false) return false;
    if (adminCfg.removedModels?.[pId]?.includes(mId)) return false;
    return true;
  };

  // 1. Provedores Embutidos
  for (const [pId, prov] of Object.entries(PROVIDER_REGISTRY)) {
    if (!isProviderEnabled(pId)) continue;

    const baseModels = prov.models?.length > 0 ? prov.models : getStaticCatalog(pId);
    const customList = adminCfg?.customModels?.[pId] || [];
    const allModels = Array.from(new Set([...baseModels, ...customList]));

    for (const mId of allModels) {
      if (!isModelEnabled(pId, mId)) continue;
      const dedupeKey = `${pId}:${mId}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      entries.push(enrichModelMetadata(pId, mId, customList.includes(mId) ? "custom" : "static"));
    }
  }

  // 2. Provedores Customizados
  if (adminCfg?.customProviders) {
    for (const [cpId, cp] of Object.entries(adminCfg.customProviders)) {
      if (!isProviderEnabled(cpId)) continue;
      const customList = adminCfg.customModels?.[cpId] || [];
      const allModels = Array.from(new Set([...(cp.models || []), ...customList]));

      for (const mId of allModels) {
        if (!isModelEnabled(cpId, mId)) continue;
        const dedupeKey = `${cpId}:${mId}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        entries.push({
          providerId: cpId,
          modelId: mId,
          source: "custom",
          pricing: {
            input_per_million: cp.costPerMillionInput ?? 0,
            output_per_million: cp.costPerMillionOutput ?? 0,
            free_tier: cp.freeTier ?? false,
          },
          context_length: 128000,
          capabilities: {
            streaming: cp.supportsStreaming ?? true,
            tools: cp.supportsTools ?? false,
            vision: cp.supportsVision ?? false,
          },
          owned_by: cp.name || cpId,
        });
      }
    }
  }

  return entries;
}
