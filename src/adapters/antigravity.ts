import { ANTIGRAVITY_PUBLIC_CONFIG } from "@/config/constants";
import { formatGeminiSSEChunkToOpenAI, formatGeminiToOpenAI, formatOpenAIToGemini } from "./gemini";
import type { ChatCompletionRequest, ChatCompletionResponse } from "@/types/openai";

/**
 * Executa requisição para a API Upstream do Antigravity (Google Cloud Code Assist)
 */
export async function executeAntigravityRequest(
  request: ChatCompletionRequest,
  accessToken: string,
  projectId: string,
  modelName: string
): Promise<Response> {
  const geminiPayload = formatOpenAIToGemini(request);

  // Normaliza nome do modelo para o Code Assist
  const cleanModel = modelName.replace("antigravity/", "");
  const upstreamModel = cleanModel.includes("claude")
    ? "claude-3-7-sonnet"
    : cleanModel.includes("flash")
      ? "gemini-2.5-flash"
      : "gemini-2.5-pro";

  const isStream = request.stream ?? false;
  const endpoint = isStream
    ? `${ANTIGRAVITY_PUBLIC_CONFIG.runtimeBaseUrl}/v1internal:streamGenerateCode?alt=sse`
    : `${ANTIGRAVITY_PUBLIC_CONFIG.runtimeBaseUrl}/v1internal:generateCode`;

  const envelope = {
    model: upstreamModel,
    project: projectId || undefined,
    userPrompt: {
      ...geminiPayload,
    },
  };

  const upstreamRes = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": "Antigravity-CLI/2.5.0",
      "X-Goog-Api-Client": "gl-node/20.20.2 antigravity/2.5.0",
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
    // O envelope do Code Assist pode encapsular dentro de response ou direto
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
