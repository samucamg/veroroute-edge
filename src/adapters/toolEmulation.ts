import type { ChatCompletionRequest, ChatMessage, ToolCall } from "@/types/openai";

// Tool Calling emulation for providers without native tools support.
// Centralised in cascade.ts — adapters never call this directly.

export function injectToolCallingPrompt(request: ChatCompletionRequest): ChatCompletionRequest {
  if (!request.tools || request.tools.length === 0) return request;

  const toolsSchema = JSON.stringify(
    request.tools.map((t) => ({
      name: t.function.name,
      description: t.function.description || "",
      parameters: t.function.parameters || {},
    })),
    null,
    2
  );

  const toolChoice = request.tool_choice;
  let directive = "If you need to use a tool, respond STRICTLY with this JSON and nothing else:";
  if (toolChoice === "required") {
    directive = "You MUST use one or more tools. Respond STRICTLY with this JSON and nothing else:";
  } else if (toolChoice === "none") {
    // No tool calling at all — return without injection
    return { ...request, tools: undefined, tool_choice: undefined };
  } else if (typeof toolChoice === "object" && toolChoice && (toolChoice as any)?.function?.name) {
    directive = `You MUST call the tool "${(toolChoice as any).function.name}". Respond STRICTLY with this JSON:`;
  }

  const fence = "\`\`\`";
  const promptInjection = [
    "",
    "[TOOL CALLING INSTRUCTION]",
    "You have access to the following tools:",
    toolsSchema,
    "",
    directive,
    fence + "json",
    '{',
    '  "tool_calls": [{ "name": "<tool_name>", "arguments": {} }]',
    '}',
    fence,
    "Use ONLY tool names listed above. If no tool needed, respond normally.",
  ].join("\n");

  // Deep copy messages to avoid mutating the caller's data
  const updatedMessages: ChatMessage[] = request.messages.map((m) => ({ ...m }));

  // Convert role:"tool" messages to user messages for providers that don't understand them
  for (let i = 0; i < updatedMessages.length; i++) {
    const msg = updatedMessages[i];
    if (msg.role === "tool") {
      updatedMessages[i] = {
        role: "user" as const,
        content: `[Tool result for call ${(msg as any).tool_call_id || "unknown"}]:\n${typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)}`,
      };
    } else if (msg.role === "assistant" && (msg as any).tool_calls) {
      // Convert assistant tool_calls to text so the model sees them in context
      const calls = (msg as any).tool_calls as ToolCall[];
      const callText = calls.map((tc) => `[Called tool ${tc.function.name}(${tc.function.arguments})]`).join("\n");
      updatedMessages[i] = {
        role: "assistant" as const,
        content: ((typeof msg.content === "string" ? msg.content : "") + "\n" + callText).trim(),
      };
    }
  }

  const firstSystem = updatedMessages.find((m) => m.role === "system");
  if (firstSystem) {
    firstSystem.content = (
      typeof firstSystem.content === "string"
        ? firstSystem.content
        : JSON.stringify(firstSystem.content)
    ) + "\n" + promptInjection;
  } else {
    updatedMessages.unshift({ role: "system", content: promptInjection.trim() });
  }

  return { ...request, messages: updatedMessages, tools: undefined, tool_choice: undefined, stream: false };
}

function extractJson(text: string): unknown | null {
  if (!text) return null;
  // Strategy 1: code-fence
  const fenceRe = /\`\`\`(?:json)?\s*([\s\S]*?)\`\`\`/;
  const fenceMatch = text.match(fenceRe);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch { /* continue */ }
  }
  // Strategy 2: top-level JSON object
  const braceStart = text.indexOf("{");
  const braceEnd = text.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    try { return JSON.parse(text.slice(braceStart, braceEnd + 1)); } catch { /* continue */ }
  }
  return null;
}

export function parseEmulatedToolCalls(
  content: string,
  declaredTools?: ChatCompletionRequest["tools"],
  options?: { parallelToolCalls?: boolean }
): { content: string | null; tool_calls?: ToolCall[] } {
  if (!content) return { content: null };

  const parsed = extractJson(content);
  if (!parsed || typeof parsed !== "object") return { content };

  const obj = parsed as Record<string, unknown>;
  let rawCalls = Array.isArray(obj.tool_calls) ? obj.tool_calls : null;
  // Also try top-level {name, arguments} 
  if (!rawCalls && typeof obj.name === "string") rawCalls = [obj];
  if (!rawCalls || rawCalls.length === 0) return { content };

  const validNames = new Set(declaredTools?.map((t) => t.function.name) || []);

  const toolCalls: ToolCall[] = [];
  for (const raw of rawCalls) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const name = String(r.name || r.function_name || "");
    if (!name || (validNames.size > 0 && !validNames.has(name))) continue;

    let args: string;
    try {
      args = typeof r.arguments === "string" ? r.arguments : JSON.stringify(r.arguments ?? {});
      JSON.parse(args); // validate
    } catch {
      args = "{}";
    }

    toolCalls.push({
      id: `call_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`,
      type: "function" as const,
      function: { name, arguments: args },
    });
  }

  if (toolCalls.length === 0) return { content };

  // Honour parallel_tool_calls: false — return only the first
  const limited = options?.parallelToolCalls === false ? [toolCalls[0]] : toolCalls;

  return { content: null, tool_calls: limited };
}

/** Post-process a non-streaming completion response from an emulated provider. */
export function postProcessEmulatedResponse(
  body: any,
  originalRequest: ChatCompletionRequest
): any {
  if (!body?.choices?.[0]?.message?.content) return body;
  const raw = body.choices[0].message.content;
  const result = parseEmulatedToolCalls(raw, originalRequest.tools, {
    parallelToolCalls: (originalRequest as any).parallel_tool_calls,
  });
  body.choices[0].message.content = result.content;
  if (result.tool_calls) {
    body.choices[0].message.tool_calls = result.tool_calls;
    body.choices[0].finish_reason = "tool_calls";
  }
  return body;
}

/** Convert a completed JSON response body to an SSE stream (for emulated streaming). */
export function completionToSSE(body: any): Response {
  const encoder = new TextEncoder();
  const model = body.model || "unknown";
  const id = body.id || `chatcmpl-${crypto.randomUUID().slice(0,10)}`;
  const created = body.created || Math.floor(Date.now() / 1000);
  const msg = body.choices?.[0]?.message;
  const chunks: string[] = [];

  // Role chunk
  chunks.push(JSON.stringify({
    id, object: "chat.completion.chunk", created, model,
    choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }],
  }));

  if (msg?.tool_calls) {
    for (let i = 0; i < msg.tool_calls.length; i++) {
      const tc = msg.tool_calls[i];
      chunks.push(JSON.stringify({
        id, object: "chat.completion.chunk", created, model,
        choices: [{ index: 0, delta: { tool_calls: [{
          index: i, id: tc.id, type: "function",
          function: { name: tc.function.name, arguments: tc.function.arguments },
        }] }, finish_reason: null }],
      }));
    }
  } else if (msg?.content) {
    // Emit content in ~80 char pieces
    const text = msg.content;
    for (let i = 0; i < text.length; i += 80) {
      chunks.push(JSON.stringify({
        id, object: "chat.completion.chunk", created, model,
        choices: [{ index: 0, delta: { content: text.slice(i, i + 80) }, finish_reason: null }],
      }));
    }
  }

  // Finish chunk
  const finishReason = msg?.tool_calls ? "tool_calls" : (body.choices?.[0]?.finish_reason || "stop");
  chunks.push(JSON.stringify({
    id, object: "chat.completion.chunk", created, model,
    choices: [{ index: 0, delta: {}, finish_reason: finishReason }],
  }));

  const sseText = chunks.map((c) => `data: ${c}\n\n`).join("") + "data: [DONE]\n\n";
  return new Response(encoder.encode(sseText), {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}
