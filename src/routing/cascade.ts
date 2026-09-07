import { DEFAULT_COMBOS, DEFAULT_MODELS_CATALOG } from "@/config/constants";
import { executeAntigravityRequest } from "@/adapters/antigravity";
import { executeCloudflareAI } from "@/adapters/cloudflare-ai";
import { executeOneMinAI } from "@/adapters/onemin";
import { executeOpenAICompatible } from "@/adapters/openai-compatible";
import { getValidAntigravityAccessToken } from "@/oauth/antigravity";
import { markKeyRateLimited, selectActiveKey } from "./keyPool";
import { getAdminConfig } from "@/admin/store";
import { registerCustomProvider } from "@/config/providers";
import { evaluateQuotaShare, recordQuotaShareUsage } from "./quotaShare";
import { applyRoutingStrategy, recordCandidateSuccess, type TargetCandidate } from "./strategies";
import type { ChatCompletionRequest } from "@/types/openai";
import type { EnvBindings } from "@/types/provider";

/**
 * Resolve a lista de candidatos a partir do modelo solicitado ou do combo
 */
export function resolveCandidates(request: ChatCompletionRequest): TargetCandidate[] {
  const model = request.model;

  // 1. Se for um Combo definido no VeroRoute Edge
  if (DEFAULT_COMBOS[model as keyof typeof DEFAULT_COMBOS]) {
    const combo = DEFAULT_COMBOS[model as keyof typeof DEFAULT_COMBOS];
    return combo.targets.map((t) => ({
      provider: t.provider,
      model: t.model,
    }));
  }

  // 2. Se o modelo tiver prefixo explícito do provedor
  if (model.startsWith("antigravity/")) {
    return [{ provider: "antigravity", model }];
  }
  if (model.startsWith("1min/")) {
    return [{ provider: "1min", model }];
  }
  if (model.startsWith("@cf/")) {
    return [{ provider: "cloudflare-ai", model }];
  }
  if (model.startsWith("cerebras/")) {
    return [{ provider: "cerebras", model }];
  }
  if (model.startsWith("groq/")) {
    return [{ provider: "groq", model }];
  }
  if (model.startsWith("gemini/")) {
    return [{ provider: "gemini", model }];
  }
  if (model.startsWith("azure/")) {
    return [{ provider: "azure", model }];
  }
  if (model.startsWith("bedrock/")) {
    return [{ provider: "bedrock", model }];
  }

  // 3. Procura no catálogo padrão
  const matched = DEFAULT_MODELS_CATALOG.find((m) => m.id === model);
  if (matched && matched.provider) {
    const primary: TargetCandidate = {
      provider: matched.provider,
      model: matched.id,
      cost: matched.pricing?.input_per_million || 0,
    };

    const fallbacks: TargetCandidate[] = [];
    if (primary.provider !== "groq") {
      fallbacks.push({ provider: "groq", model: "llama-3.3-70b-versatile" });
    }
    if (primary.provider !== "gemini") {
      fallbacks.push({ provider: "gemini", model: "gemini-2.5-flash" });
    }
    fallbacks.push({
      provider: "cloudflare-ai",
      model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    });

    return [primary, ...fallbacks];
  }

  // 4. Default: Procura na Groq, Gemini ou Cloudflare
  return [
    { provider: "groq", model: "llama-3.3-70b-versatile" },
    { provider: "gemini", model: "gemini-2.5-flash" },
    { provider: "cloudflare-ai", model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast" },
    { provider: "pollinations", model: "openai" },
  ];
}

/**
 * Aplica regras de administração na lista de candidatos do roteamento:
 *  - Prioriza provedores customizados quando o modelo usa o prefixo <id>/
 *  - Filtra provedores desabilitados no painel de administração
 *  - Remove modelos excluídos individualmente
 */
async function applyAdminRouting(
  ordered: TargetCandidate[],
  request: ChatCompletionRequest,
  env: EnvBindings
): Promise<TargetCandidate[]> {
  const cfg = await getAdminConfig(env);
  const customIds = new Set(Object.keys(cfg.customProviders));
  let candidates = [...ordered];

  // 1. Se o modelo usar prefixo de provedor customizado, prioriza esse provedor
  const model = request.model || "";
  const slashIdx = model.indexOf("/");
  const colonIdx = model.indexOf(":");
  let prefix = "";
  if (slashIdx > 0) prefix = model.slice(0, slashIdx);
  else if (colonIdx > 0) prefix = model.slice(0, colonIdx);

  if (prefix && customIds.has(prefix) && !candidates.some((c) => c.provider === prefix)) {
    candidates.unshift({ provider: prefix, model });
  }

  // 2. Filtra provedores desabilitados no painel de administração
  candidates = candidates.filter((cand) => {
    if (customIds.has(cand.provider)) return true; // custom sempre ativo
    const state = cfg.providerStates[cand.provider]?.enabled;
    return state !== false; // sem estado explícito => habilitado
  });

  // 3. Remove modelos marcados como excluídos individualmente
  candidates = candidates.filter((cand) => {
    const modelKey = cand.provider + "/" + cand.model;
    return cfg.modelStates[modelKey]?.enabled !== false;
  });

  return candidates;
}

/**
 * Orquestra a execução da requisição com cascata de auto-fallback e balanceamento
 */
export async function dispatchWithCascade(
  request: ChatCompletionRequest,
  env: EnvBindings
): Promise<Response> {
  const adminCfg = await getAdminConfig(env);
  // Registra provedores customizados do painel admin
  for (const [pid, cp] of Object.entries(adminCfg.customProviders)) {
    registerCustomProvider(pid, {
      name: cp.name,
      baseUrl: cp.baseUrl,
      authType: "bearer",
      models: cp.models,
      freeTier: cp.freeTier,
      supportsStreaming: cp.supportsStreaming,
      supportsTools: cp.supportsTools,
      supportsVision: cp.supportsVision,
    });
  }
  const initialCandidates = resolveCandidates(request);
  const strategy = request.routing_strategy || env.DEFAULT_ROUTING_STRATEGY || "priority";
  const orderedCandidates = await applyAdminRouting(
    applyRoutingStrategy(initialCandidates, strategy, request.user),
    request,
    env
  );

  // Verificação opcional de Quota Sharing (Compartilhamento de Cota)
  if (env.ENABLE_QUOTA_SHARING === "true" && request.user) {
    const quotaDecision = await evaluateQuotaShare(request.user, env);
    if (!quotaDecision.allowed) {
      return new Response(
        JSON.stringify({
          error: {
            message: "Limite de cota compartilhada excedido. Aguarde a liberação da janela de uso.",
            type: "quota_share_exceeded",
            details: quotaDecision,
          },
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  const errors: Array<{ provider: string; model: string; status: number; message: string }> = [];

  for (const candidate of orderedCandidates) {
    try {
      let response: Response;

      // 1. Antigravity CLI / Google Cloud Code Assist (OAuth)
      if (candidate.provider === "antigravity") {
        const { accessToken, projectId } = await getValidAntigravityAccessToken(env);
        response = await executeAntigravityRequest(request, accessToken, projectId, candidate.model);
      }
      // 2. 1min.ai (com ReAct Tool Calling)
      else if (candidate.provider === "1min") {
        const key = await selectActiveKey(env, "1min");
        response = await executeOneMinAI(request, key, candidate.model);
      }
      // 3. Cloudflare Workers AI Nativo
      else if (candidate.provider === "cloudflare-ai") {
        response = await executeCloudflareAI(request, env.AI, candidate.model);
      }
      // 4. Provedores padrão (OpenAI, Gemini, Groq, Cerebras, Alibaba, Azure, Bedrock, etc.)
      else {
        const apiKey = await selectActiveKey(env, candidate.provider);
        if (!apiKey && candidate.provider !== "pollinations") {
          errors.push({
            provider: candidate.provider,
            model: candidate.model,
            status: 401,
            message: `Sem chave de API configurada para o provedor ${candidate.provider}. Pulando para fallback...`,
          });
          continue;
        }

        response = await executeOpenAICompatible(request, candidate.provider, apiKey, candidate.model);

        if (response.status === 429) {
          markKeyRateLimited(env, apiKey, 60);
        }
      }

      // Se a resposta foi bem-sucedida, registra sucesso e telemetria
      if (response.ok) {
        recordCandidateSuccess(candidate, request.user);
        if (request.user) {
          recordQuotaShareUsage(request.user, 1);
        }
        return response;
      }

      // Se foi erro de cota (429), erro de credencial (401, 403) ou erro do servidor (500-504), tenta o próximo candidato
      if (
        response.status === 429 ||
        response.status === 401 ||
        response.status === 403 ||
        (response.status >= 500 && response.status <= 504)
      ) {
        const errBody = await response.clone().text().catch(() => "");
        errors.push({
          provider: candidate.provider,
          model: candidate.model,
          status: response.status,
          message: errBody.slice(0, 200),
        });
        console.warn(
          `[VeroRoute Cascata] Provedor ${candidate.provider} (${candidate.model}) falhou com status ${response.status}. Pulando para o próximo fallback...`
        );
        continue;
      }

      // Outros erros
      return response;
    } catch (err: any) {
      errors.push({
        provider: candidate.provider,
        model: candidate.model,
        status: 500,
        message: err.message || String(err),
      });
      console.warn(
        `[VeroRoute Cascata] Exceção no provedor ${candidate.provider} (${candidate.model}): ${err.message}. Continuando cascata...`
      );
    }
  }

  // Se todos falharam
  return new Response(
    JSON.stringify({
      error: {
        message: "Todos os provedores da cascata de fallback falharam ou estão indisponíveis.",
        type: "veroroute_cascade_failure",
        attempts: errors,
      },
    }),
    { status: 503, headers: { "Content-Type": "application/json" } }
  );
}
