import { getProviderConfig } from "@/config/providers";
import { GEMINI_OPENAI_COMPAT_BASE_URL, resolveGeminiSurface } from "@/config/providerAliases";
import { formatGeminiSSEChunkToOpenAI, formatGeminiToOpenAI, formatOpenAIToGemini } from "./gemini";
import type { ChatCompletionRequest } from "@/types/openai";

/**
 * Executa chamadas para qualquer provedor compatível com OpenAI ou Google Gemini REST
 */
export async function executeOpenAICompatible(
  request: ChatCompletionRequest,
  providerId: string,
  apiKey: string,
  modelName: string,
  overrideBaseUrl?: string,
  overrideProtocol?: string
): Promise<Response> {
  const provider = getProviderConfig(providerId);
  // Provedores customizados genéricos (não registrados em PROVIDER_REGISTRY) são válidos
  // desde que um overrideBaseUrl seja fornecido. Não lançamos erro nesse caso.
  if (!provider && !overrideBaseUrl) {
    throw new Error(`Provedor desconhecido e sem baseUrl configurado: ${providerId}`);
  }

  // --- Caso Especial: Google Gemini REST API ---
  if (providerId === "gemini") {
    const isStream = request.stream ?? false;
    const cleanModel = modelName.replace("gemini/", "");
    const nativeBase = (overrideBaseUrl || provider?.baseUrl || "https://generativelanguage.googleapis.com/v1beta").replace(/\/+$/, "");

    // A superfície depende da credencial: chaves "AQ.…" do AI Studio só são
    // autenticadas na camada compatível com OpenAI (Bearer); chaves "AIza…"
    // funcionam na API nativa (?key=).
    const surface = resolveGeminiSurface(nativeBase, apiKey);
    const useOpenAICompat = surface === "openai";
    const base = useOpenAICompat ? GEMINI_OPENAI_COMPAT_BASE_URL : nativeBase;

    const url = useOpenAICompat
      ? `${base}/chat/completions`
      : isStream
        ? `${base}/models/${cleanModel}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`
        : `${base}/models/${cleanModel}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const geminiBody = formatOpenAIToGemini(request);

    const res = await fetch(url, {
      method: "POST",
      headers: useOpenAICompat
        ? { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }
        : { "Content-Type": "application/json" },
      body: JSON.stringify(
        useOpenAICompat
          ? {
              ...request,
              model: cleanModel,
              routing_strategy: undefined,
              output_style: undefined,
              enable_search: undefined,
              search_provider: undefined,
              fallbacks: undefined,
              compression: undefined,
            }
          : geminiBody
      ),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(
        JSON.stringify({
          error: {
            message: `Erro Gemini (${res.status}): ${errText}`,
            status: res.status,
          },
        }),
        { status: res.status, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!isStream) {
      const geminiJson = await res.json();
      // A camada OpenAI-compat já devolve o formato OpenAI: passa direto.
      const openAiJson = useOpenAICompat ? geminiJson : formatGeminiToOpenAI(geminiJson, modelName);
      return new Response(JSON.stringify(openAiJson), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Streaming da camada OpenAI-compat é SSE no formato OpenAI: passthrough.
    if (useOpenAICompat) {
      return new Response(res.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Stream SSE Transform
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const reader = res.body?.getReader();
    if (!reader) return new Response("Sem corpo de resposta", { status: 500 });

    (async () => {
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
              const chunkJson = JSON.parse(dataStr);
              const openAiSSE = formatGeminiSSEChunkToOpenAI(chunkJson, modelName);
              if (openAiSSE) {
                await writer.write(encoder.encode(openAiSSE));
              }
            } catch {}
          }
        }
        await writer.write(encoder.encode("data: [DONE]\n\n"));
        await writer.close();
      } catch (err) {
        console.error("Erro streaming Gemini:", err);
        try {
          await writer.abort(err);
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

  // --- Provedores Padrão OpenAI (Groq, Cerebras, OpenRouter, SambaNova, Mistral, DeepSeek, Pollinations) ---
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  if (providerId === "openrouter") {
    headers["HTTP-Referer"] = "https://omniroute.inglescurso.com.br";
    headers["X-Title"] = "OmniRoute Serverless";
  }

  // Suporte a provedores com protocolo Anthropic (customizados ou nativos)
  const effectiveProtocol = overrideProtocol || (provider as any)?.protocol || (provider as any)?.authType || "bearer";
  const isAnthropicProtocol = effectiveProtocol === "anthropic";
  if (isAnthropicProtocol) {
    // Anthropic-compatible: x-api-key header + anthropic-version
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
    delete headers["Authorization"];
  }

  // Prefixo de provedor do gateway (ex.: "groq/llama-3.3-70b-versatile")
  // deve ser removido, mas ids nativos que usam namespace precisam ser
  // preservados: Groq usa "openai/gpt-oss-20b", Nvidia usa "meta/llama..." e OpenRouter usa "deepseek/deepseek-v4.1-flash".
  let targetModel = modelName;
  // Remove somente o prefixo do provedor que esta realmente executando a chamada.
  const acceptedPrefixes = providerId === "antigravity" ? ["antigravity", "agy"] : [providerId];
  const providerPrefix = acceptedPrefixes.find((p) => targetModel.startsWith(p + "/"));
  if (providerPrefix) {
    targetModel = targetModel.slice(providerPrefix.length + 1) || targetModel;
  }

  const rawBase = (overrideBaseUrl || provider?.baseUrl || "").replace(/\/+$/, "");
  let endpoint = `${rawBase}/chat/completions`;
  if (!rawBase) {
    throw new Error(`Provedor ${providerId} não tem baseUrl configurado`);
  }
  if (providerId === "azure") {
    const cleanAzureBase = rawBase;
    const apiVersion = "2024-02-15-preview";
    endpoint = `${cleanAzureBase}/openai/deployments/${targetModel}/chat/completions?api-version=${apiVersion}`;
    headers["api-key"] = apiKey;
    delete headers["Authorization"];
  } else if (rawBase.endsWith("/chat/completions")) {
    endpoint = rawBase;
  }
  const bodyPayload = {
    ...request,
    model: targetModel,
    // Remove parâmetros customizados do OmniRoute antes de enviar ao upstream
    routing_strategy: undefined,
    output_style: undefined,
    enable_search: undefined,
    search_provider: undefined,
    fallbacks: undefined,
    compression: undefined,
  };

  const upstreamResponse = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(bodyPayload),
  });

  // Em caso de streaming SSE pass-through direto
  if (request.stream && upstreamResponse.ok) {
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Resposta síncrona JSON ou erro
  const respBody = await upstreamResponse.text();
  return new Response(respBody, {
    status: upstreamResponse.status,
    headers: {
      "Content-Type": upstreamResponse.headers.get("Content-Type") || "application/json",
    },
  });
}
