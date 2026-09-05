import type {
  AnthropicMessagesRequest,
  AnthropicMessagesResponse,
} from "@/types/anthropic";
import type {
  ChatCompletionChunk,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatMessage,
} from "@/types/openai";

/**
 * Converte requisição Anthropic (/v1/messages) para OpenAI (/v1/chat/completions)
 */
export function formatAnthropicToOpenAI(
  req: AnthropicMessagesRequest
): ChatCompletionRequest {
  const messages: ChatMessage[] = [];

  // System prompt
  if (req.system) {
    const sysContent =
      typeof req.system === "string"
        ? req.system
        : req.system.map((s) => s.text).join("\n\n");
    messages.push({ role: "system", content: sysContent });
  }

  for (const msg of req.messages) {
    if (typeof msg.content === "string") {
      messages.push({ role: msg.role, content: msg.content });
      continue;
    }

    // Blocos estruturados da Anthropic
    let combinedText = "";
    const toolCalls: any[] = [];

    for (const block of msg.content) {
      if (block.type === "text") {
        combinedText += (combinedText ? "\n" : "") + block.text;
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id,
          type: "function",
          function: {
            name: block.name,
            arguments: JSON.stringify(block.input || {}),
          },
        });
      } else if (block.type === "tool_result") {
        const textRes =
          typeof block.content === "string"
            ? block.content
            : block.content.map((b: any) => b.text || "").join("\n");
        messages.push({
          role: "tool",
          tool_call_id: block.tool_use_id,
          content: textRes,
        });
      }
    }

    if (combinedText || toolCalls.length > 0) {
      messages.push({
        role: msg.role,
        content: combinedText,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      });
    }
  }

  // Mapeia tools da Anthropic para OpenAI
  const tools = req.tools?.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));

  return {
    model: req.model,
    messages,
    stream: req.stream ?? false,
    temperature: req.temperature,
    top_p: req.top_p,
    max_tokens: req.max_tokens,
    tools,
  };
}

/**
 * Converte resposta OpenAI ChatCompletion para Anthropic MessagesResponse
 */
export function formatOpenAIToAnthropic(
  openAiRes: ChatCompletionResponse
): AnthropicMessagesResponse {
  const choice = openAiRes.choices?.[0];
  const msg = choice?.message;
  const content: any[] = [];

  if (msg?.content) {
    content.push({ type: "text", text: msg.content });
  }

  if (msg?.tool_calls && msg.tool_calls.length > 0) {
    for (const tc of msg.tool_calls) {
      let parsedInput = {};
      try {
        parsedInput = JSON.parse(tc.function.arguments || "{}");
      } catch {}
      content.push({
        type: "tool_use",
        id: tc.id,
        name: tc.function.name,
        input: parsedInput,
      });
    }
  }

  let stopReason: any = "end_turn";
  if (choice?.finish_reason === "length") stopReason = "max_tokens";
  if (choice?.finish_reason === "tool_calls") stopReason = "tool_use";

  return {
    id: openAiRes.id || `msg_${Math.random().toString(36).substring(2, 12)}`,
    type: "message",
    role: "assistant",
    model: openAiRes.model,
    content,
    stop_reason: stopReason,
    stop_sequence: null,
    usage: {
      input_tokens: openAiRes.usage?.prompt_tokens || 0,
      output_tokens: openAiRes.usage?.completion_tokens || 0,
    },
  };
}

/**
 * Converte chunks SSE do formato OpenAI para o formato Anthropic SSE
 */
export function createOpenAIToAnthropicTransformStream(modelName: string): TransformStream {
  let messageStarted = false;
  let textBlockOpen = false;
  // FIX 3a: buffer de linha para reconstituir chunks TCP cortados ao meio de um JSON
  let lineBuffer = "";
  // FIX 3b: rastreia blocos de tool_input em construção
  const pendingToolInputs: Record<number, string> = {};
  let blockIndex = 0;
  let tokenCount = 0;
  const msgId = `msg_${Math.random().toString(36).substring(2, 12)}`;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  function enq(controller: TransformStreamDefaultController, data: string) {
    controller.enqueue(encoder.encode(data));
  }

  function ensureMessageStart(controller: TransformStreamDefaultController) {
    if (!messageStarted) {
      enq(
        controller,
        `event: message_start\ndata: {"type":"message_start","message":{"id":"${msgId}","type":"message","role":"assistant","content":[],"model":"${modelName}","stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":10,"output_tokens":0}}}\n\n`
      );
      messageStarted = true;
    }
  }

  function openTextBlock(controller: TransformStreamDefaultController) {
    if (!textBlockOpen) {
      enq(
        controller,
        `event: content_block_start\ndata: {"type":"content_block_start","index":${blockIndex},"content_block":{"type":"text","text":""}}\n\n`
      );
      textBlockOpen = true;
    }
  }

  function closeTextBlock(controller: TransformStreamDefaultController) {
    if (textBlockOpen) {
      enq(controller, `event: content_block_stop\ndata: {"type":"content_block_stop","index":${blockIndex}}\n\n`);
      blockIndex++;
      textBlockOpen = false;
    }
  }

  return new TransformStream({
    transform(chunk, controller) {
      // FIX 3a: Acumula no buffer de linha para evitar parse de JSON cortado pelo TCP
      lineBuffer += decoder.decode(chunk, { stream: true });
      const lines = lineBuffer.split("\n");
      // Mantém o último fragmento incompleto no buffer
      lineBuffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const dataStr = trimmed.replace(/^data:\s*/, "");

        if (dataStr === "[DONE]") {
          closeTextBlock(controller);
          enq(
            controller,
            `event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":${tokenCount}}}\n\n`
          );
          enq(controller, `event: message_stop\ndata: {"type":"message_stop"}\n\n`);
          continue;
        }

        try {
          const parsed = JSON.parse(dataStr) as ChatCompletionChunk;
          const delta = parsed.choices?.[0]?.delta;
          if (!delta) continue;

          ensureMessageStart(controller);

          // FIX 3b: Suporte a tool_calls no stream SSE (Claude Code CLI, Cline, Cursor, Roo Code)
          if (Array.isArray((delta as any).tool_calls) && (delta as any).tool_calls.length > 0) {
            closeTextBlock(controller);
            for (const tc of (delta as any).tool_calls) {
              const tcIdx = tc.index ?? 0;
              if (tc.function?.name) {
                const toolId = tc.id ?? `toolu_${Math.random().toString(36).slice(2, 10)}`;
                enq(
                  controller,
                  `event: content_block_start\ndata: {"type":"content_block_start","index":${blockIndex + tcIdx},"content_block":{"type":"tool_use","id":"${toolId}","name":${JSON.stringify(tc.function.name)},"input":{}}}\n\n`
                );
                pendingToolInputs[tcIdx] = "";
              }
              if (tc.function?.arguments) {
                pendingToolInputs[tcIdx] = (pendingToolInputs[tcIdx] ?? "") + tc.function.arguments;
                enq(
                  controller,
                  `event: content_block_delta\ndata: {"type":"content_block_delta","index":${blockIndex + tcIdx},"delta":{"type":"input_json_delta","partial_json":${JSON.stringify(tc.function.arguments)}}}\n\n`
                );
              }
            }
            continue;
          }

          // Conteúdo textual normal
          if (delta.content) {
            openTextBlock(controller);
            tokenCount++;
            enq(
              controller,
              `event: content_block_delta\ndata: {"type":"content_block_delta","index":${blockIndex},"delta":{"type":"text_delta","text":${JSON.stringify(delta.content)}}}\n\n`
            );
          }
        } catch {
          // Chunk inválido — ignorar silenciosamente
        }
      }
    },

    flush(controller) {
      // FIX 3a: Processa dados residuais no buffer ao fechar o stream
      if (lineBuffer.trim().startsWith("data:")) {
        const dataStr = lineBuffer.trim().replace(/^data:\s*/, "");
        try {
          const parsed = JSON.parse(dataStr) as ChatCompletionChunk;
          const delta = parsed.choices?.[0]?.delta;
          if (delta?.content) {
            ensureMessageStart(controller);
            openTextBlock(controller);
            tokenCount++;
            enq(
              controller,
              `event: content_block_delta\ndata: {"type":"content_block_delta","index":${blockIndex},"delta":{"type":"text_delta","text":${JSON.stringify(delta.content)}}}\n\n`
            );
          }
        } catch {}
      }
      closeTextBlock(controller);
    },
  });
}
