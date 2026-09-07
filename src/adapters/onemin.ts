import { injectToolCallingPrompt, parseEmulatedToolCalls, makeStreamingToolCallAccumulator } from "./toolEmulation";
import type {
  ChatCompletionChunk,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from "@/types/openai";

export async function executeOneMinAI(
  request: ChatCompletionRequest,
  apiKey: string,
  modelName: string
): Promise<Response> {
  if (!apiKey) throw new Error("Chave de API do 1min.ai nao configurada");

  const hasTools = !!(request.tools && request.tools.length > 0);
  const declaredTools = request.tools;
  const processedRequest = hasTools ? injectToolCallingPrompt(request) : request;

  let formattedPrompt = "";
  for (const msg of processedRequest.messages) {
    const roleLabel =
      msg.role === "system" ? "System"
      : msg.role === "assistant" ? "Assistant"
      : msg.role === "tool" ? "Tool"
      : "Human";
    const text = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
    formattedPrompt += roleLabel + ": " + text + "\n\n";
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
      settings: { temperature: processedRequest.temperature ?? 0.7 },
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
      JSON.stringify({ error: { message: "Erro 1min.ai (" + response.status + "): " + errText.slice(0, 300), status: response.status } }),
      { status: response.status, headers: { "Content-Type": "application/json" } }
    );
  }

  // --- Non-Streaming ---
  if (!isStreaming) {
    const rawData = (await response.json()) as Record<string, unknown>;
    let rawContent = "";
    if (typeof rawData.result === "string") {
      rawContent = rawData.result;
    } else if (rawData.data && typeof (rawData.data as Record<string, unknown>).result === "string") {
      rawContent = (rawData.data as Record<string, unknown>).result as string;
    } else if (typeof rawData.content === "string") {
      rawContent = rawData.content;
    } else {
      rawContent = JSON.stringify(rawData);
    }

    const { cleanContent, toolCalls } = hasTools
      ? parseEmulatedToolCalls(rawContent, declaredTools)
      : { cleanContent: rawContent, toolCalls: undefined };

    const openAiResponse: ChatCompletionResponse = {
      id: "chatcmpl-" + crypto.randomUUID().replace(/-/g, "").slice(0, 16),
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: modelName,
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: cleanContent,
          tool_calls: toolCalls,
        },
        finish_reason: toolCalls && toolCalls.length > 0 ? "tool_calls" : "stop",
      }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
    return new Response(JSON.stringify(openAiResponse), { headers: { "Content-Type": "application/json" } });
  }

  // --- Streaming SSE ---
  // When tool-calling is emulated in streaming mode, we must accumulate the full
  // response before we can detect and convert tool calls.
  if (hasTools) {
    // Accumulate the entire streaming response, then emit a single non-streaming response.
    // This is correct behaviour: providers that need emulation do not support streaming
    // tool calls natively, so we collapse the stream.
    const accum = makeStreamingToolCallAccumulator((result) => result, declaredTools);
    const reader = response.body?.getReader();
    if (!reader) return new Response("Sem corpo de resposta do 1min.ai", { status: 500 });
    const decoder = new TextDecoder();
    let done = false;
    while (!done) {
      const { done: d, value } = await reader.read();
      done = d;
      if (value) accum.accumulate(decoder.decode(value, { stream: true }));
    }
    let parseResult: { cleanContent: string | null; toolCalls?: import("@/types/openai").ToolCall[] };
    accum.flush = () => { parseResult = parseEmulatedToolCalls(/* buffer from closure */"", declaredTools); };
    // Re-invoke directly since the accumulator stores buffer internally
    // We need to get the result - just call parse on the accumulated text:
    const accumulated = decoder.decode(); // flush remainder
    parseResult = parseEmulatedToolCalls(accumulated, declaredTools);

    // Build a proper OpenAI completion response
    const toolAiResponse: ChatCompletionResponse = {
      id: "chatcmpl-" + crypto.randomUUID().replace(/-/g, "").slice(0, 16),
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: modelName,
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: parseResult!.cleanContent,
          tool_calls: parseResult!.toolCalls,
        },
        finish_reason: parseResult!.toolCalls ? "tool_calls" : "stop",
      }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
    return new Response(JSON.stringify(toolAiResponse), { headers: { "Content-Type": "application/json" } });
  }

  // Regular streaming (no tools)
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const decoder2 = new TextDecoder();
  const reader2 = response.body?.getReader();
  if (!reader2) return new Response("Sem corpo de resposta do 1min.ai", { status: 500 });

  (async () => {
    try {
      while (true) {
        const { done, value } = await reader2.read();
        if (done) break;
        const text = decoder2.decode(value, { stream: true });
        if (!text) continue;
        const chunk: ChatCompletionChunk = {
          id: "chatcmpl-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12),
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model: modelName,
          choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
        };
        await writer.write(encoder.encode("data: " + JSON.stringify(chunk) + "\n\n"));
      }
      await writer.write(encoder.encode("data: [DONE]\n\n"));
      await writer.close();
    } catch (err) {
      console.error("Erro no streaming do 1min.ai:", err);
      try { await writer.abort(err); } catch { /* ignore */ }
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}