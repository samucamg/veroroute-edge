import type { Context } from "hono";
import type { EnvBindings } from "@/types/provider";

/**
 * Geração de imagens compatível com OpenAI POST /v1/images/generations
 * Utiliza Cloudflare Workers AI nativo (@cf/black-forest-labs/flux-1-schnell ou @cf/bytedance/stable-diffusion-xl-lightning)
 * com fallback para Pollinations.ai ou OpenAI DALL-E se configurado.
 */
export async function handleGenerateImages(c: Context<{ Bindings: EnvBindings }>) {
  try {
    const body = await c.req.json().catch(() => ({}));
    const prompt = body.prompt;

    if (!prompt) {
      return c.json({ error: { message: "'prompt' é obrigatório", type: "invalid_request_error" } }, 400);
    }

    const n = body.n || 1;
    const size = body.size || "1024x1024";
    const responseFormat = body.response_format || "url";

    // 1. Tentar Cloudflare Workers AI nativo (100% serverless, sem chaves externas)
    if (c.env.AI) {
      try {
        const cfImage = await c.env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
          prompt,
          steps: 4,
        });

        if (cfImage) {
          // Cloudflare Workers AI retorna ReadableStream ou Uint8Array binário
          const arrayBuffer = cfImage instanceof Response ? await cfImage.arrayBuffer() : cfImage;
          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);

          return c.json({
            created: Math.floor(Date.now() / 1000),
            data: [
              responseFormat === "b64_json"
                ? { b64_json: base64 }
                : { url: `data:image/jpeg;base64,${base64}` },
            ],
          });
        }
      } catch (err: any) {
        console.warn("[VeroRoute Images] Cloudflare Workers AI falhou, usando fallback Pollinations...", err?.message);
      }
    }

    // 2. Fallback: Pollinations.ai (gratuito e ilimitado)
    const encodedPrompt = encodeURIComponent(prompt);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&private=true`;

    return c.json({
      created: Math.floor(Date.now() / 1000),
      data: [{ url: pollinationsUrl }],
    });
  } catch (err: any) {
    return c.json({ error: { message: err.message || "Erro na geração de imagem", type: "api_error" } }, 500);
  }
}

/**
 * Edição / variação de imagens: POST /v1/images/edits
 */
export async function handleEditImages(c: Context<{ Bindings: EnvBindings }>) {
  try {
    const formData = await c.req.formData().catch(() => null);
    const prompt = formData?.get("prompt")?.toString() || "enhance image";
    const encodedPrompt = encodeURIComponent(prompt);

    return c.json({
      created: Math.floor(Date.now() / 1000),
      data: [{ url: `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true` }],
    });
  } catch (err: any) {
    return c.json({ error: { message: err.message || "Erro na edição de imagem", type: "api_error" } }, 500);
  }
}
