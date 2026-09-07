import type { ChatCompletionRequest, ChatMessage, ToolCall } from "@/types/openai";

// Tool Calling emulation for providers without native tools support.
// Bugs fixed: non-colliding IDs, multi-strategy JSON extraction,
// tool name validation, arguments normalisation.

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

  const fence = "```";
  const promptInjection = [
    "",
    "[TOOL CALLING INSTRUCTION]",
    "You have access to the following tools:",
    toolsSchema,
    "",
    "If you need to use a tool, respond STRICTLY with this JSON and nothing else:",
    fence + "json",
    "{",
    "  \"tool_calls\": [{ \"name\": \"<tool_name>\", \"arguments\": {} }]",
    "}",
    fence,
    "Use ONLY tool names listed above. If no tool needed, respond normally.",
  ].join("\n");

  const updatedMessages: ChatMessage[] = [...request.messages];
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

  return { ...request, messages: updatedMessages, tools: undefined, tool_choice: undefined };
}

function extractJson(text: string): unknown | null {
  if (!text) return null;
  // Strategy 1: code-fence
  const fenceRe = /`{3}(?:json)?\s*([\s\S]*?)\s*`{3}/;
  const fm = text.match(fenceRe);
  if (fm) { try { return JSON.parse(fm[1].trim()); } catch { /* next */ } }
  // Strategy 2: first {...} block
  const bm = text.match(/\{[\s\S]*\}/);
  if (bm) { try { return JSON.parse(bm[0]); } catch { /* next */ } }
  // Strategy 3: whole string
  try { return JSON.parse(text.trim()); } catch { /* give up */ }
  return null;
}

export function parseEmulatedToolCalls(
  content: string,
  declaredTools?: { function: { name: string } }[]
): { cleanContent: string | null; toolCalls?: ToolCall[] } {
  if (!content) return { cleanContent: content };
  if (!content.includes("tool_calls")) return { cleanContent: content };

  const parsed = extractJson(content);
  if (!parsed || typeof parsed !== "object" || parsed === null) return { cleanContent: content };

  const raw = parsed as Record<string, unknown>;
  if (!Array.isArray(raw.tool_calls) || raw.tool_calls.length === 0) return { cleanContent: content };

  const allowed = new Set<string>(declaredTools?.map((t) => t.function.name) ?? []);
  const toolCalls: ToolCall[] = [];

  for (const tc of raw.tool_calls as Array<Record<string, unknown>>) {
    const name = typeof tc.name === "string" ? tc.name.trim() : "";
    if (!name) continue;
    if (allowed.size > 0 && !allowed.has(name)) {
      console.warn("[toolEmulation] Unknown tool returned by model: " + name + " — skipping");
      continue;
    }
    let argsStr = "{}";
    if (typeof tc.arguments === "string") {
      try { JSON.parse(tc.arguments); argsStr = tc.arguments; } catch { argsStr = "{}"; }
    } else if (tc.arguments && typeof tc.arguments === "object") {
      argsStr = JSON.stringify(tc.arguments);
    }
    toolCalls.push({
      id: "call_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16),
      type: "function",
      function: { name, arguments: argsStr },
    });
  }

  if (toolCalls.length === 0) return { cleanContent: content };
  return { cleanContent: null, toolCalls };
}

export function makeStreamingToolCallAccumulator(
  onComplete: (result: { cleanContent: string | null; toolCalls?: ToolCall[] }) => void,
  declaredTools?: { function: { name: string } }[]
): { accumulate: (chunk: string) => void; flush: () => void } {
  let buffer = "";
  return {
    accumulate(chunk: string) { buffer += chunk; },
    flush() { onComplete(parseEmulatedToolCalls(buffer, declaredTools)); },
  };
}