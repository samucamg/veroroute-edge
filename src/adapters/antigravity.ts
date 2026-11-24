import { ANTIGRAVITY_PUBLIC_CONFIG } from "@/config/constants";
import { formatGeminiSSEChunkToOpenAI, formatGeminiToOpenAI, formatOpenAIToGemini } from "./gemini";
import type { ChatCompletionRequest, ChatCompletionResponse } from "@/types/openai";

/**
 * Executa requisição para a API Upstream do Antigravity (Google Cloud Code Assist).
 *
 * Envelope oficial do Cloud Code Assist (v1internal):
 *   POST {runtimeBaseUrl}/v1internal:generateContent
 *   body: { "model": "...", "project": "...", "request": { <GenerateContentRequest> } }
 *   resposta: { "response": { "candidates": [...], "usageMetadata": {...} } }
 */
export async function executeAntigravityRequest(
  request: ChatCompletionRequest,
  accessToken: string,
  projectId: string,
  modelName: string,
  overrideBaseUrl?: string,
  signal?: AbortSignal
): Promise<Response> {
  const geminiPayload = formatOpenAIToGemini(request);
  const upstreamModel = normalizeAntigravityModel(modelName);

  // Defaults usados pelo executor do OmniRouter/IDE. Alguns modelos Gemini 3.x
  // rejeitam topP=0.95 sem topK; o cliente oficial usa topK=40 e topP=1.0.
  const generationConfig = (geminiPayload.generationConfig || {}) as Record<string, unknown>;
  if (generationConfig.topK === undefined) generationConfig.topK = 40;
  if (generationConfig.topP === undefined || generationConfig.topP === 0.95) generationConfig.topP = 1.0;

  const isHydrogenSonar =
    upstreamModel === "gemini-4-hydrogen-sonar" ||
    upstreamModel === "MODEL_PLACEHOLDER_M578";
  const isHydrogenEffort =
    !isHydrogenSonar && upstreamModel.startsWith("gemini-4-hydrogen");

  // Alinhado ao CloudCodeAdapter.php e payload_adapter.go:
  // - gemini-4-hydrogen-sonar tem nivel unico (65.536 tokens), remove thinkingLevel,
  //   usa thinkingBudget >= 32 e labels MODEL_PLACEHOLDER_M578.
  // - Variantes de esforco (-low/-medium/-high/-xhigh/-tiered-*) suportam ate 262.144
  //   tokens de saida e nao usam thinkingLevel separado no thinkingConfig.
  if (isHydrogenSonar) {
    const effort = typeof request.reasoning_effort === "string" ? request.reasoning_effort.trim().toLowerCase() : "";
    let budget = effort === "high" ? 1024 : effort === "medium" ? 256 : 32;
    const reqMax = Math.min(65536, Number(generationConfig.maxOutputTokens ?? 0));
    if (reqMax >= 128) {
      generationConfig.maxOutputTokens = reqMax;
      budget = Math.max(32, Math.min(budget, Math.floor(reqMax / 2)));
    } else {
      budget = 32;
      generationConfig.maxOutputTokens = Math.max(128, 32 + Math.max(64, reqMax));
    }
    generationConfig.thinkingConfig = { thinkingBudget: budget };
    geminiPayload.labels = {
      used_claude: "false",
      used_claude_conservative: "false",
      used_non_gemini_model: "false",
      model_enum: "MODEL_PLACEHOLDER_M578",
    };
  } else if (isHydrogenEffort) {
    const reqMax = Number(generationConfig.maxOutputTokens ?? 0);
    if (reqMax > 0) {
      const capped = Math.min(262144, reqMax);
      if (capped < 256) {
        generationConfig.maxOutputTokens = Math.max(256, 32 + Math.max(64, capped));
        generationConfig.thinkingConfig = { thinkingBudget: 32 };
      } else {
        generationConfig.maxOutputTokens = capped;
      }
    }
    if (generationConfig.thinkingConfig && typeof generationConfig.thinkingConfig === "object") {
      delete (generationConfig.thinkingConfig as Record<string, unknown>).thinkingLevel;
    }
  }

  geminiPayload.generationConfig = generationConfig;

  const isStream = request.stream ?? false;
  const runtimeBaseUrl = (overrideBaseUrl || ANTIGRAVITY_PUBLIC_CONFIG.runtimeBaseUrl).replace(/\/+$/, "");
  const endpoint = isStream
    ? runtimeBaseUrl + ANTIGRAVITY_PUBLIC_CONFIG.streamGenerateContentPath
    : runtimeBaseUrl + ANTIGRAVITY_PUBLIC_CONFIG.generateContentPath;

  const envelope: Record<string, unknown> = {
    model: upstreamModel,
    // O Code Assist só aceita o campo "request" com o GenerateContentRequest dentro.
    request: {
      ...geminiPayload,
    },
  };
  if (projectId) envelope.project = projectId;

  const upstreamRes = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: isStream ? "text/event-stream" : "application/json",
      "User-Agent": ANTIGRAVITY_PUBLIC_CONFIG.userAgent,
    },
    body: JSON.stringify(envelope),
    signal,
  });

  if (!upstreamRes.ok) {
    const errText = await upstreamRes.text();
    return new Response(
      JSON.stringify({
        error: {
          message: `Antigravity Upstream Erro (${upstreamRes.status}): ${errText}`,
          type: "upstream_error",
          status: upstreamRes.status,
        },
      }),
      { status: upstreamRes.status, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!isStream) {
    const rawData = (await upstreamRes.json()) as any;
    // O envelope do Code Assist pode encapsular dentro de response ou vir direto
    const contentData = rawData.response || rawData;
    const openAIRes = formatGeminiToOpenAI(contentData, modelName);
    return new Response(JSON.stringify(openAIRes), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Se for streaming, transforma os eventos do SSE upstream no formato OpenAI SSE
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const reader = upstreamRes.body?.getReader();
  if (!reader) {
    return new Response("Erro ao ler body do upstream", { status: 500 });
  }

  (async () => {
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":") || !trimmed.startsWith("data:")) continue;

          const dataStr = trimmed.replace(/^data:\s*/, "");
          if (dataStr === "[DONE]") {
            await writer.write(encoder.encode("data: [DONE]\n\n"));
            continue;
          }

          try {
            const parsed = JSON.parse(dataStr);
            const chunkCandidate = parsed.response || parsed;
            const openAiSSE = formatGeminiSSEChunkToOpenAI(chunkCandidate, modelName);
            if (openAiSSE) {
              await writer.write(encoder.encode(openAiSSE));
            }
          } catch {
            // Linha intermediária não formatada em JSON
          }
        }
      }

      await writer.write(encoder.encode("data: [DONE]\n\n"));
      await writer.close();
    } catch (err) {
      console.error("Erro no streaming do Antigravity:", err);
      try {
        await writer.abort(err);
      } catch {}
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/**
 * Remove o prefixo do provedor e traduz nomes legados para os ids atuais do
 * Cloud Code Assist (o upstream rejeita ids que não existem mais).
 */
export function normalizeAntigravityModel(modelName: string): string {
  const clean = (modelName || "")
    .replace(/^agy\//, "")
    .replace(/^antigravity\//, "")
    .trim();

  // Sem prefixo/alias inventado; apenas normaliza o nome genérico sem sufixo para -high.
  if (clean === "gemini-4-hydrogen") return "gemini-4-hydrogen-high";
  return clean;
}
