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
  overrideBaseUrl?: string
): Promise<Response> {
  const geminiPayload = formatOpenAIToGemini(request);
  const upstreamModel = normalizeAntigravityModel(modelName);

  // Defaults usados pelo executor do OmniRouter/IDE. Alguns modelos Gemini 3.x
  // rejeitam topP=0.95 sem topK; o cliente oficial usa topK=40 e topP=1.0.
  const generationConfig = (geminiPayload.generationConfig || {}) as Record<string, unknown>;
  if (generationConfig.topK === undefined) generationConfig.topK = 40;
  if (generationConfig.topP === undefined || generationConfig.topP === 0.95) generationConfig.topP = 1.0;
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

  // Sem tabela de aliases "adivinhados": o catálogo real é descoberto em
  // /v1internal:fetchAvailableModels e modelos como gemini-2.5-pro,
  // gemini-2.5-flash e claude-3-7-sonnet continuam válidos upstream — traduzir
  // esses ids para outro modelo trocaria silenciosamente o que o usuário pediu.
  return clean;
}
