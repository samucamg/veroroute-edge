import { PROVIDER_REGISTRY } from "@/config/providers";
import { executeOpenAICompatible } from "@/adapters/openai-compatible";
import { selectActiveCredential } from "@/routing/keyPool";
import type { ChatCompletionRequest, ChatMessage, ChatMessageContentPart } from "@/types/openai";
import type { EnvBindings } from "@/types/provider";

/**
 * Detecta se a requisição contém imagens e se o modelo alvo não suporta visão.
 * Nesse caso, analisa a imagem via Gemini Flash ou Workers AI e injeta a descrição no prompt.
 */
export async function applyModalityBridge(
  request: ChatCompletionRequest,
  env: EnvBindings
): Promise<ChatCompletionRequest> {
  const model = request.model;
  // Se o modelo já for multimodal nativo, dispensa a ponte
  const isVisionCapable =
    model.includes("gemini") ||
    model.includes("claude") ||
    model.includes("gpt-4o") ||
    model.includes("antigravity");

  if (isVisionCapable) return request;

  let hasImages = false;
  for (const msg of request.messages) {
    if (Array.isArray(msg.content)) {
      if (msg.content.some((p) => p.type === "image_url")) {
        hasImages = true;
        break;
      }
    }
  }

  if (!hasImages) return request;

  console.log(`[Modality Bridge] Imagem detectada para modelo text-only (${model}). Executando transcrição visual...`);

  const updatedMessages: ChatMessage[] = [];

  for (const msg of request.messages) {
    if (!Array.isArray(msg.content)) {
      updatedMessages.push(msg);
      continue;
    }

    const newParts: ChatMessageContentPart[] = [];

    for (const part of msg.content) {
      if (part.type === "text") {
        newParts.push(part);
      } else if (part.type === "image_url") {
        // Despacha a imagem para o Gemini Flash para extração de texto
        try {
          const description = await describeImageWithVision(part.image_url.url, env);
          newParts.push({
            type: "text",
            text: `\n[Modality Bridge - Descrição da Imagem Anexada]:\n${description}\n`,
          });
        } catch (err) {
          console.error("Erro na ponte de modalidade:", err);
          newParts.push({
            type: "text",
            text: "\n[Imagem anexada pelo usuário - falha na transcrição visual]\n",
          });
        }
      }
    }

    updatedMessages.push({ ...msg, content: newParts });
  }

  return {
    ...request,
    messages: updatedMessages,
  };
}

async function describeImageWithVision(imageUrl: string, env: EnvBindings): Promise<string> {
  const credential = await selectActiveCredential(env, "gemini");
  const geminiKey = credential.apiKey;
  if (!geminiKey) return "Imagem presente (chave Gemini não disponível para descrição).";

  const visionReq: ChatCompletionRequest = {
    model: "gemini-2.5-flash",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Descreva esta imagem com máxima clareza, destacando textos, tabelas, gráficos, códigos ou elementos relevantes para um desenvolvedor.",
          },
          {
            type: "image_url",
            image_url: { url: imageUrl },
          },
        ],
      },
    ],
    max_tokens: 1000,
    stream: false,
  };

  const res = await executeOpenAICompatible(visionReq, "gemini", geminiKey, "gemini-2.5-flash", credential.proxyUrl);
  if (!res.ok) return "Não foi possível transcrever a imagem.";

  const data = (await res.json()) as any;
  return data.choices?.[0]?.message?.content || "Imagem analisada.";
}
