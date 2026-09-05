import type { ChatCompletionRequest, ChatMessage } from "@/types/openai";
import type { OutputStyle } from "@/types/provider";

/**
 * Aplica o pipeline de compressão de contexto e injeção de estilo de saída
 */
export function applyContextCompression(
  request: ChatCompletionRequest,
  outputStyle?: OutputStyle | string
): ChatCompletionRequest {
  let messages = [...request.messages];

  // 1. Session Deduplication (elimina mensagens duplicadas consecutivas)
  messages = deduplicateMessages(messages);

  // 2. Lite Compression (higienização de whitespaces excessivos e logs de terminal)
  messages = messages.map((msg) => {
    if (typeof msg.content === "string") {
      return {
        ...msg,
        content: compressTextLite(msg.content),
      };
    }
    return msg;
  });

  // 3. Injeção de Estilo de Saída (Output Persona) no System Prompt
  const style = outputStyle || request.output_style || "none";
  if (style !== "none") {
    messages = injectOutputStyle(messages, style);
  }

  return {
    ...request,
    messages,
  };
}

function deduplicateMessages(messages: ChatMessage[]): ChatMessage[] {
  const result: ChatMessage[] = [];
  const seenHashes = new Set<string>();

  for (const msg of messages) {
    // Mantém mensagens do usuário sempre
    if (msg.role === "user") {
      result.push(msg);
      continue;
    }

    // FIX 2: Mensagens de tool e assistant com tool_calls NUNCA devem ser deduplicadas.
    // APIs da OpenAI e Anthropic exigem que toda resposta de tool corresponda a um
    // tool_call_id aberto — remover qualquer uma causa HTTP 400 (tool_call_id mismatch).
    const hasToolCalls = Array.isArray((msg as any).tool_calls) && (msg as any).tool_calls.length > 0;
    if (msg.role === "tool" || hasToolCalls) {
      result.push(msg);
      continue;
    }

    const contentStr = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
    // Hash simples de 32 bits
    let hash = 0;
    for (let i = 0; i < contentStr.length; i++) {
      hash = (hash << 5) - hash + contentStr.charCodeAt(i);
      hash |= 0;
    }
    const hashKey = `${msg.role}:${hash}`;

    if (!seenHashes.has(hashKey)) {
      seenHashes.add(hashKey);
      result.push(msg);
    }
  }

  return result;
}

function compressTextLite(text: string): string {
  if (!text || text.length < 50) return text;

  return text
    // Remove códigos ANSI de terminal (RTK)
    .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "")
    // Remove múltiplos espaços vazios consecutivos
    .replace(/[ \t]{3,}/g, "  ")
    // Remove quebras de linha excessivas (mais de 2 consecutivas)
    .replace(/\n{3,}/g, "\n\n");
}

function injectOutputStyle(messages: ChatMessage[], style: string): ChatMessage[] {
  const stylePrompts: Record<string, string> = {
    concise:
      "\n[ESTILO: PROSA CONCISA] Seja direto, claro e econômico com palavras. Evite introduções e conclusões óbvias.",
    yagni:
      "\n[ESTILO: YAGNI - MENOS CÓDIGO] Forneça apenas o código estritamente necessário. Não crie abstrações prematuras ou boilerplate desnecessário.",
    ponytail:
      "\n[ESTILO: SENIOR LAZY DEV] Foque 100% na solução prática sem rodeios ou teorias desnecessárias. Vá direto ao arquivo e comando de execução.",
    "action-first":
      "\n[ESTILO: ACTION FIRST] Responda começando diretamente pela ação/código. Sem saudações ou explicações prévias.",
  };

  const instruction = stylePrompts[style];
  if (!instruction) return messages;

  const firstSystem = messages.find((m) => m.role === "system");
  if (firstSystem) {
    firstSystem.content =
      (typeof firstSystem.content === "string"
        ? firstSystem.content
        : JSON.stringify(firstSystem.content)) + instruction;
    return messages;
  }

  return [{ role: "system", content: instruction.trim() }, ...messages];
}
