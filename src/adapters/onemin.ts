import { injectToolCallingPrompt, parseEmulatedToolCalls } from "./toolEmulation";
import type {
  ChatCompletionChunk,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from "@/types/openai";

/**
 * Adaptador para o gateway 1min.ai com suporte a streaming e emulação de Tool Calling
 */
export async function executeOneMinAI(
  request: ChatCompletionRequest,
  apiKey: string,
  modelName: string
): Promise<Response> {
  if (!apiKey) {
    throw new Error("Chave de API do 1min.ai não configurada");
  }

  // 1. Aplica emulação de Tool Calling se a requisição contiver tools
  const hasTools = request.tools && request.tools.length > 0;
  const processedRequest = hasTools ? injectToolCallingPrompt(request) : request;

  // 2. Converte histórico de mensagens em prompt estruturado para 1min.ai
  let formattedPrompt = "";
  for (const msg of processedRequest.messages) {
    const roleLabel =
      msg.role === "system"
        ? "System"
        : msg.role === "assistant"
          ? "Assistant"
          : msg.role === "tool"
            ? "Tool"
            : "Human";
    const text = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
    formattedPrompt += `${roleLabel}: ${text}\n\n`;
  }

  const cleanModel = modelName.replace("1min/", "");
  const isStreaming = processedRequest.stream ?? false;
  const apiUrl = isStreaming
    ? "https://api.1min.ai/api/chat-with-ai?isStreaming=true"
    : "https://api.1min.ai/api/chat-with-ai";

  const requestBody = {
    type: "CHAT",
    model: cleanModel || "gpt-4o",
    promptObject: {
      prompt: formattedPrompt.trim(),
      settings: {
        temperature: processedRequest.temperature ?? 0.7,
      },
    },
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "API-KEY": apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    return new Response(
      JSON.stringify({
        error: {
          message: `Erro 1min.ai (${response.status}): ${errText.slice(0, 300)}`,
          status: response.status,
        },
      }),
      { status: response.status, headers: { "Content-Type": "application/json" } }
    );
  }

  // Modo Não-Streaming
  if (!isStreaming) {
    const rawData = (await response.json()) as any;
    let rawContent = "";

    // 1min.ai pode retornar dados em result ou direto
    if (typeof rawData.result === "string") {
      rawContent = rawData.result;
    } else if (rawData.data?.result) {
      rawContent = rawData.data.result;
    } else if (typeof rawData.content === "string") {
      rawContent = rawData.content;
    } else {
      rawContent = JSON.stringify(rawData);
    }

    // Processa se houve chamada de ferramenta emulada
    const { cleanContent, toolCalls } = hasTools
      ? parseEmulatedToolCalls(rawContent)
      : { cleanContent: rawContent, toolCalls: undefined };

    const openAiResponse: ChatCompletionResponse = {
      id: `chatcmpl-${Math.random().toString(36).substring(2, 12)}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: modelName,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: cleanContent,
            tool_calls: toolCalls,
          },
          finish_reason: toolCalls && toolCalls.length > 0 ? "tool_calls" : "stop",
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };

    return new Response(JSON.stringify(openAiResponse), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Modo Streaming SSE
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const reader = response.body?.getReader();
  if (!reader) return new Response("Sem corpo de resposta do 1min.ai", { status: 500 });

  (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        if (!text) continue;

        const chunk: ChatCompletionChunk = {
          id: `chatcmpl-${Math.random().toString(36).substring(2, 12)}`,
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model: modelName,
          choices: [
            {
              index: 0,
              delta: { content: text },
              finish_reason: null,
            },
          ],
        };

        await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      }

      await writer.write(encoder.encode("data: [DONE]\n\n"));
      await writer.close();
    } catch (err) {
      console.error("Erro no streaming do 1min.ai:", err);
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
