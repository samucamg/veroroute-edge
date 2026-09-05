import { searchWithDuckDuckGo } from "./duckduckgo";
import { searchWithSearXNG } from "./searxng";
import { searchWithTavily } from "./tavily";
import type { SearchRequest, SearchResponse, SearchResultItem } from "@/types/search";
import type { ChatCompletionRequest } from "@/types/openai";
import type { EnvBindings } from "@/types/provider";

/**
 * Despacha busca com cascata inteligente:
 * Se houver SEARXNG_URL configurada pelo usuário ➔ usa SearXNG.
 * Se não houver ou falhar ➔ usa DuckDuckGo (sem chave, 100% gratuito) ➔ Tavily.
 */
export async function dispatchSearch(
  req: SearchRequest,
  env: EnvBindings
): Promise<SearchResponse> {
  const startTime = Date.now();
  const requestedProvider = req.provider || "auto";

  let results: SearchResultItem[] = [];
  let usedProvider = requestedProvider;

  // 1. SearXNG (Apenas se a URL tiver sido configurada pelo usuário)
  const userSearxUrl = env.SEARXNG_URL?.trim();
  if (
    userSearxUrl &&
    userSearxUrl.length > 0 &&
    (requestedProvider === "auto" || requestedProvider === "searxng")
  ) {
    try {
      results = await searchWithSearXNG(req, userSearxUrl);
      usedProvider = "searxng";
    } catch (err) {
      console.warn("SearXNG customizado falhou ou indisponível, usando fallback DuckDuckGo...", err);
    }
  }

  // 2. DuckDuckGo (Sempre disponível, sem custo e sem chave)
  if (results.length === 0 && (requestedProvider === "auto" || requestedProvider === "duckduckgo")) {
    try {
      results = await searchWithDuckDuckGo(req);
      usedProvider = "duckduckgo";
    } catch (err) {
      console.warn("DuckDuckGo falhou, tentando fallback Tavily...", err);
    }
  }

  // 3. Tavily (Se configurado chave no ambiente)
  if (results.length === 0 && (requestedProvider === "auto" || requestedProvider === "tavily")) {
    const tavilyKey = env.TAVILY_API_KEYS?.split(",")[0]?.trim();
    if (tavilyKey) {
      try {
        results = await searchWithTavily(req, tavilyKey);
        usedProvider = "tavily";
      } catch (err) {
        console.warn("Tavily falhou:", err);
      }
    }
  }

  const tookMs = Date.now() - startTime;

  return {
    query: req.query,
    provider: usedProvider,
    took_ms: tookMs,
    results,
    total_results: results.length,
  };
}

/**
 * Injeta contexto de busca web na requisição Chat Completion (Search-Augmented Generation / RAG)
 */
export async function augmentRequestWithWebSearch(
  request: ChatCompletionRequest,
  env: EnvBindings
): Promise<ChatCompletionRequest> {
  if (!request.enable_search) return request;

  const userMessages = request.messages.filter((m) => m.role === "user");
  const lastUserMsg = userMessages[userMessages.length - 1];
  if (!lastUserMsg) return request;

  const query =
    typeof lastUserMsg.content === "string"
      ? lastUserMsg.content
      : JSON.stringify(lastUserMsg.content);

  const searchRes = await dispatchSearch({ query, limit: 4 }, env);
  if (searchRes.results.length === 0) return request;

  let ragContext = "\n\n--- RESULTADOS DA BUSCA WEB EM TEMPO REAL ---\n";
  for (const item of searchRes.results) {
    ragContext += `[Fonte: ${item.title}] (${item.url})\n${item.content}\n\n`;
  }
  ragContext += "----------------------------------------------\nUse as informações acima se forem relevantes para responder.";

  const updatedMessages = [...request.messages];
  const firstSystem = updatedMessages.find((m) => m.role === "system");

  if (firstSystem) {
    firstSystem.content =
      (typeof firstSystem.content === "string"
        ? firstSystem.content
        : JSON.stringify(firstSystem.content)) + ragContext;
  } else {
    updatedMessages.unshift({
      role: "system",
      content: `Você é um assistente com acesso à web.${ragContext}`,
    });
  }

  return {
    ...request,
    messages: updatedMessages,
  };
}
