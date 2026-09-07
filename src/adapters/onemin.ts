import type { ChatCompletionRequest, ChatCompletionResponse, ChatCompletionChunk } from "@/types/openai";
import { proxyFetch } from "@/routing/proxy";

const ONEMIN_BASE = "https://api.1min.ai/api/features";

/**
 * Execute 1min.ai request — clean adapter, no internal tool emulation.
 * Tool emulation is handled centrally by cascade.ts.
 */
export async function executeOneMinAI(
  request: ChatCompletionRequest,
  apiKey: string,
  modelName: string,
  proxyUrl?: string
): Promise<Response> {
  if (!apiKey) throw new Error("1min.ai: API key not configured");

  const cleanModel = modelName.replace("1min/", "");
  const isStream = request.stream ?? false;

  const body = {
    type: "CHAT",
    model: cleanModel,
    promptObject: request.messages.map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    })),
    // Forward native tool fields only if present (cascade strips them for emulation)
    ...(request.tools ? { tools: request.tools } : {}),
    ...(request.tool_choice ? { tool_choice: request.tool_choice } : {}),
  };

  const response = await proxyFetch(ONEMIN_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "API-KEY": apiKey,
    },
    body: JSON.stringify(body),
  }, proxyUrl);

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: { message: `1min.ai (${response.status}): ${errText.slice(0, 200)}`, status: response.status } }),
      { status: response.status, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!isStream) {
    const raw = await response.json() as any;
    const content = raw?.aiRecord?.aiRecordDetail?.resultObject?.content
      || raw?.aiRecord?.aiRecordDetail?.resultObject
      || raw?.result || "";
    const textContent = typeof content === "string" ? content : JSON.stringify(content);

    const completion: ChatCompletionResponse = {
      id: `chatcmpl-${crypto.randomUUID().slice(0, 10)}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: cleanModel,
      choices: [{
        index: 0,
        message: { role: "assistant", content: textContent },
        finish_reason: "stop",
      }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
    return Response.json(completion);
  }

  // Streaming: transform 1min SSE to OpenAI-compatible SSE
  if (!response.body) {
    return new Response("No stream body", { status: 502 });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          // Send final chunk and DONE
          const finalChunk: ChatCompletionChunk = {
            id: `chatcmpl-${crypto.randomUUID().slice(0, 10)}`,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model: cleanModel,
            choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\ndata: [DONE]\n\n`));
          controller.close();
          return;
        }

        const text = decoder.decode(value, { stream: true });
        // 1min may return plain text or SSE lines
        const lines = text.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          let content = trimmed;
          if (trimmed.startsWith("data: ")) {
            const data = trimmed.slice(6);
            if (data === "[DONE]") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              // If already OpenAI-format, pass through
              if (parsed.choices) {
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                continue;
              }
              content = parsed.content || parsed.text || data;
            } catch {
              content = data;
            }
          }

          const chunk: ChatCompletionChunk = {
            id: `chatcmpl-${crypto.randomUUID().slice(0, 10)}`,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model: cleanModel,
            choices: [{ index: 0, delta: { content }, finish_reason: null }],
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        }
      } catch (err) {
        controller.error(err);
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
