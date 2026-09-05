import type { ChatCompletionChunk, ChatCompletionRequest, ChatCompletionResponse } from "@/types/openai";

/**
 * Executa modelo via Cloudflare Workers AI nativo (env.AI)
 */
export async function executeCloudflareAI(
  request: ChatCompletionRequest,
  aiBinding: any,
  modelName: string
): Promise<Response> {
  if (!aiBinding) {
    throw new Error("Binding Cloudflare Workers AI (env.AI) não está configurado neste Worker.");
  }

  // Normaliza o nome do modelo
  let cfModel = modelName;
  if (!cfModel.startsWith("@cf/")) {
    cfModel = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
  }

  // Formata mensagens para o formato do Workers AI
  const messages = request.messages.map((m) => ({
    role: m.role,
    content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
  }));

  const isStream = request.stream ?? false;

  try {
    if (isStream) {
      const streamRes = await aiBinding.run(cfModel, {
        messages,
        stream: true,
        max_tokens: request.max_tokens || 2048,
        temperature: request.temperature || 0.7,
      });

      // streamRes é uma ReadableStream nativa da Cloudflare
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      (async () => {
        const reader = streamRes.getReader();
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
                const parsed = JSON.parse(dataStr);
                const deltaContent = parsed.response || "";

                const chunk: ChatCompletionChunk = {
                  id: `chatcmpl-${Math.random().toString(36).substring(2, 12)}`,
                  object: "chat.completion.chunk",
                  created: Math.floor(Date.now() / 1000),
                  model: modelName,
                  choices: [
                    {
                      index: 0,
                      delta: { content: deltaContent },
                      finish_reason: null,
                    },
                  ],
                };

                await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
              } catch {}
            }
          }

          await writer.write(encoder.encode("data: [DONE]\n\n"));
          await writer.close();
        } catch (e) {
          console.error("Erro no stream Cloudflare AI:", e);
          try {
            await writer.abort(e);
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

    // Modo não-streaming
    const aiOutput = await aiBinding.run(cfModel, {
      messages,
      stream: false,
      max_tokens: request.max_tokens || 2048,
      temperature: request.temperature || 0.7,
    });

    const textContent = aiOutput.response || "";

    const responseObj: ChatCompletionResponse = {
      id: `chatcmpl-${Math.random().toString(36).substring(2, 12)}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: modelName,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: textContent,
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };

    return new Response(JSON.stringify(responseObj), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: {
          message: `Erro no Workers AI (${cfModel}): ${error.message || error}`,
          type: "workers_ai_error",
        },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
