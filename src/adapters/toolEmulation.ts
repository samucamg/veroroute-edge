import type { ChatCompletionRequest, ChatMessage, ToolCall } from "@/types/openai";

/**
 * Emula suporte a Tool Calling (estilo ReAct) para provedores ou modelos
 * que não suportam a propriedade `tools` nativa da OpenAI (como 1min.ai, Pollinations, etc.)
 */

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

  const promptInjection = `
[TOOL CALLING INSTRUCTION]
Você tem acesso às seguintes ferramentas:
${toolsSchema}

Se for necessário invocar uma ferramenta para responder, responda ESTRITAMENTE com um bloco JSON no seguinte formato (sem texto adicional):
\`\`\`json
{
  "tool_calls": [
    {
      "name": "nome_da_ferramenta",
      "arguments": { ...argumentos... }
    }
  ]
}
\`\`\`
Caso não precise usar ferramentas, responda normalmente em texto.`;

  const updatedMessages: ChatMessage[] = [...request.messages];
  const firstSystem = updatedMessages.find((m) => m.role === "system");

  if (firstSystem) {
    firstSystem.content =
      (typeof firstSystem.content === "string"
        ? firstSystem.content
        : JSON.stringify(firstSystem.content)) + `\n${promptInjection}`;
  } else {
    updatedMessages.unshift({
      role: "system",
      content: promptInjection.trim(),
    });
  }

  return {
    ...request,
    messages: updatedMessages,
    // Remove tools do request original para não causar erro 400 no provedor upstream
    tools: undefined,
    tool_choice: undefined,
  };
}

/**
 * Detecta se a resposta do modelo contém chamada de ferramenta emulada e converte para OpenAI ToolCalls
 */
export function parseEmulatedToolCalls(content: string): {
  cleanContent: string | null;
  toolCalls?: ToolCall[];
} {
  if (!content || !content.includes("tool_calls")) {
    return { cleanContent: content };
  }

  // Tenta extrair bloco json ```json ... ```
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || [null, content];
  const potentialJson = jsonMatch[1] || content;

  try {
    const parsed = JSON.parse(potentialJson.trim());
    if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
      const toolCalls: ToolCall[] = parsed.tool_calls.map((tc: any) => ({
        id: `call_${Math.random().toString(36).substring(2, 10)}`,
        type: "function",
        function: {
          name: tc.name,
          arguments: typeof tc.arguments === "string" ? tc.arguments : JSON.stringify(tc.arguments || {}),
        },
      }));

      return {
        cleanContent: null,
        toolCalls,
      };
    }
  } catch {}

  return { cleanContent: content };
}
