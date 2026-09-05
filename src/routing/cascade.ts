import { DEFAULT_COMBOS, DEFAULT_MODELS_CATALOG } from "@/config/constants";
import { executeAntigravityRequest } from "@/adapters/antigravity";
import { executeCloudflareAI } from "@/adapters/cloudflare-ai";
import { executeOneMinAI } from "@/adapters/onemin";
import { executeOpenAICompatible } from "@/adapters/openai-compatible";
import { getValidAntigravityAccessToken } from "@/oauth/antigravity";
import { markKeyRateLimited, selectActiveKey } from "./keyPool";
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
 * Orquestra a execução da requisição com cascata de auto-fallback e balanceamento
 */
export async function dispatchWithCascade(
  request: ChatCompletionRequest,
  env: EnvBindings
): Promise<Response> {
  const initialCandidates = resolveCandidates(request);
  const strategy = request.routing_strategy || env.DEFAULT_ROUTING_STRATEGY || "priority";
  const orderedCandidates = applyRoutingStrategy(initialCandidates, strategy, request.user);

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

      // Se foi erro transitório (429, 500, 502, 503, 504), tenta o próximo candidato
      if (response.status === 429 || (response.status >= 500 && response.status <= 504)) {
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
