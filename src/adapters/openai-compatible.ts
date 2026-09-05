import { PROVIDER_REGISTRY } from "@/config/providers";
import { formatGeminiSSEChunkToOpenAI, formatGeminiToOpenAI, formatOpenAIToGemini } from "./gemini";
import type { ChatCompletionRequest } from "@/types/openai";

/**
 * Executa chamadas para qualquer provedor compatível com OpenAI ou Google Gemini REST
 */
export async function executeOpenAICompatible(
  request: ChatCompletionRequest,
  providerId: string,
  apiKey: string,
  modelName: string
): Promise<Response> {
  const provider = PROVIDER_REGISTRY[providerId];
  if (!provider) {
    throw new Error(`Provedor desconhecido: ${providerId}`);
  }

  // --- Caso Especial: Google Gemini REST API ---
  if (providerId === "gemini") {
    const isStream = request.stream ?? false;
    const cleanModel = modelName.replace("gemini/", "");
    // FIX 1: non-streaming usa ?key=...; streaming usa ?alt=sse&key=...
    const url = isStream
      ? `${provider.baseUrl}/models/${cleanModel}:streamGenerateContent?alt=sse&key=${apiKey}`
      : `${provider.baseUrl}/models/${cleanModel}:generateContent?key=${apiKey}`;

    const geminiBody = formatOpenAIToGemini(request);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(
        JSON.stringify({
          error: {
            message: `Erro Gemini (${res.status}): ${errText}`,
            status: res.status,
          },
        }),
        { status: res.status, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!isStream) {
      const geminiJson = await res.json();
      const openAiJson = formatGeminiToOpenAI(geminiJson, modelName);
      return new Response(JSON.stringify(openAiJson), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Stream SSE Transform
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const reader = res.body?.getReader();
    if (!reader) return new Response("Sem corpo de resposta", { status: 500 });

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
            if (!trimmed.startsWith("data:")) continue;
            const dataStr = trimmed.replace(/^data:\s*/, "");

            if (dataStr === "[DONE]") {
              await writer.write(encoder.encode("data: [DONE]\n\n"));
              continue;
            }

            try {
              const chunkJson = JSON.parse(dataStr);
              const openAiSSE = formatGeminiSSEChunkToOpenAI(chunkJson, modelName);
              if (openAiSSE) {
                await writer.write(encoder.encode(openAiSSE));
              }
            } catch {}
          }
        }
        await writer.write(encoder.encode("data: [DONE]\n\n"));
        await writer.close();
      } catch (err) {
        console.error("Erro streaming Gemini:", err);
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

  // --- Provedores Padrão OpenAI (Groq, Cerebras, OpenRouter, SambaNova, Mistral, DeepSeek, Pollinations) ---
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  if (providerId === "openrouter") {
    headers["HTTP-Referer"] = "https://omniroute.inglescurso.com.br";
    headers["X-Title"] = "OmniRoute Serverless";
  }

  // Ajusta o nome do modelo se houver prefixo de provedor
  let targetModel = modelName;
  if (targetModel.includes("/")) {
    if (providerId !== "openrouter") {
      targetModel = targetModel.split("/").pop() || targetModel;
    }
  }

  const endpoint = `${provider.baseUrl}/chat/completions`;
  const bodyPayload = {
    ...request,
    model: targetModel,
    // Remove parâmetros customizados do OmniRoute antes de enviar ao upstream
    routing_strategy: undefined,
    output_style: undefined,
    enable_search: undefined,
    search_provider: undefined,
    fallbacks: undefined,
    compression: undefined,
  };

  const upstreamResponse = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(bodyPayload),
  });

  // Em caso de streaming SSE pass-through direto
  if (request.stream && upstreamResponse.ok) {
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Resposta síncrona JSON ou erro
  const respBody = await upstreamResponse.text();
  return new Response(respBody, {
    status: upstreamResponse.status,
    headers: {
      "Content-Type": upstreamResponse.headers.get("Content-Type") || "application/json",
    },
  });
}
