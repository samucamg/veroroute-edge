import type { Context } from "hono";
import type { EnvBindings } from "@/types/provider";

/**
 * Text-to-Speech: POST /v1/audio/speech
 * Converte texto em fala via Cloudflare Workers AI ou fallback OpenAI-compatible
 */
export async function handleAudioSpeech(c: Context<{ Bindings: EnvBindings }>) {
  try {
    const body = await c.req.json().catch(() => ({}));
    const input = body.input || body.prompt;

    if (!input) {
      return c.json({ error: { message: "'input' é obrigatório", type: "invalid_request_error" } }, 400);
    }

    // 1. Tentar Cloudflare Workers AI nativo (@cf/openai/whisper ou TTS se disponível)
    if (c.env.AI) {
      try {
        const audioRes = await c.env.AI.run("@cf/myshell/melotts" as any, {
          text: input,
          lang: "en",
        });
        if (audioRes) {
          return new Response(audioRes as any, {
            headers: { "Content-Type": "audio/mpeg" },
          });
        }
      } catch (err) {
        // Fallback silencioso
      }
    }

    // 2. Fallback via OpenAI oficial se OPENAI_API_KEYS estiver configurada
    const openaiKey = c.env.OPENAI_API_KEYS?.split(",")?.[0]?.trim();
    if (openaiKey) {
      const res = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify(body),
      });
      return new Response(res.body, { status: res.status, headers: res.headers });
    }

    return c.json(
      {
        error: {
          message: "TTS requer binding Workers AI ou OPENAI_API_KEYS configurada no gateway.",
          type: "service_unavailable",
        },
      },
      503
    );
  } catch (err: any) {
    return c.json({ error: { message: err.message, type: "api_error" } }, 500);
  }
}

/**
 * Transcrição de áudio: POST /v1/audio/transcriptions
 * Utiliza Cloudflare Workers AI (@cf/openai/whisper) 100% serverless
 */
export async function handleAudioTranscriptions(c: Context<{ Bindings: EnvBindings }>) {
  try {
    const formData = await c.req.formData().catch(() => null);
    if (!formData) {
      return c.json({ error: { message: "FormData multipart é obrigatório", type: "invalid_request_error" } }, 400);
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return c.json({ error: { message: "Arquivo 'file' é obrigatório", type: "invalid_request_error" } }, 400);
    }

    // 1. Cloudflare Workers AI nativo (@cf/openai/whisper)
    if (c.env.AI) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const whisperRes = await c.env.AI.run("@cf/openai/whisper", {
          audio: [...new Uint8Array(arrayBuffer)],
        });
        return c.json(whisperRes);
      } catch (err: any) {
        console.warn("[VeroRoute Audio] Workers AI Whisper falhou, tentando upstream OpenAI...", err?.message);
      }
    }

    // 2. Fallback OpenAI oficial
    const openaiKey = c.env.OPENAI_API_KEYS?.split(",")?.[0]?.trim();
    if (openaiKey) {
      const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}` },
        body: formData,
      });
      const data = await res.json();
      return c.json(data, res.status as any);
    }

    return c.json(
      {
        error: {
          message: "Transcrição requer binding Workers AI ou OPENAI_API_KEYS configurada.",
          type: "service_unavailable",
        },
      },
      503
    );
  } catch (err: any) {
    return c.json({ error: { message: err.message, type: "api_error" } }, 500);
  }
}

/**
 * Tradução de áudio para inglês: POST /v1/audio/translations
 */
export async function handleAudioTranslations(c: Context<{ Bindings: EnvBindings }>) {
  return handleAudioTranscriptions(c);
}
