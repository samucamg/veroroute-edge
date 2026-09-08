import { searchWithDuckDuckGo } from "./duckduckgo";
import { searchWithSearXNG } from "./searxng";
import { searchWithTavily } from "./tavily";
import { searchWithSerper } from "./serper";
import { searchWithBrave } from "./brave";
import { getAdminConfig } from "@/admin/store";
import type { SearchRequest, SearchResponse, SearchResultItem } from "@/types/search";
import type { ChatCompletionRequest } from "@/types/openai";
import type { EnvBindings } from "@/types/provider";

/**
 * Despacha busca com cascata inteligente dinâmica:
 * 1. Consulta preferências e credenciais em AdminConfig (KV OMNI_KEYS).
 * 2. Suporta SearXNG, Tavily, Google Serper, Brave Search e fallback universal DuckDuckGo (100% gratuito e sem chave).
 */
export async function dispatchSearch(
  req: SearchRequest,
  env: EnvBindings
): Promise<SearchResponse> {
  const startTime = Date.now();
  const adminCfg = await getAdminConfig(env);
  const searchCfg = adminCfg.searchConfig;

  // Provedor solicitado no request ou o configurado como padrão no painel
  const requestedProvider = req.provider || searchCfg.activeProvider || "auto";

  let results: SearchResultItem[] = [];
  let usedProvider = requestedProvider;

  // 1. SearXNG (Se configurado no KV ou no env)
  const searxUrl = searchCfg.searxngUrl?.trim() || env.SEARXNG_URL?.trim();
  if (
    searxUrl &&
    searxUrl.length > 0 &&
    (requestedProvider === "auto" || requestedProvider === "searxng")
  ) {
    try {
      results = await searchWithSearXNG(req, searxUrl);
      usedProvider = "searxng";
    } catch (err) {
      console.warn("SearXNG falhou ou indisponível, tentando próximo...", err);
    }
  }

  // 2. Google Serper (2.500 buscas grátis)
  const serperKey = searchCfg.serperApiKey?.trim() || (env as any).SERPER_API_KEY?.trim();
  if (results.length === 0 && serperKey && (requestedProvider === "auto" || requestedProvider === "serper")) {
    try {
      results = await searchWithSerper(req, serperKey);
      usedProvider = "serper";
    } catch (err) {
      console.warn("Google Serper falhou:", err);
    }
  }

  // 3. Brave Search (2.000 buscas/mês grátis)
  const braveKey = searchCfg.braveApiKey?.trim() || (env as any).BRAVE_SEARCH_API_KEY?.trim();
  if (results.length === 0 && braveKey && (requestedProvider === "auto" || requestedProvider === "brave")) {
    try {
      results = await searchWithBrave(req, braveKey);
      usedProvider = "brave";
    } catch (err) {
      console.warn("Brave Search falhou:", err);
    }
  }

  // 4. Tavily Search (1.000 buscas/mês grátis)
  const tavilyKey = searchCfg.tavilyApiKey?.trim() || env.TAVILY_API_KEYS?.split(",")[0]?.trim();
  if (results.length === 0 && tavilyKey && (requestedProvider === "auto" || requestedProvider === "tavily")) {
    try {
      results = await searchWithTavily(req, tavilyKey);
      usedProvider = "tavily";
    } catch (err) {
      console.warn("Tavily falhou:", err);
    }
  }

  // 5. DuckDuckGo: fallback realmente universal, inclusive quando um motor
  // escolhido não possui URL/chave ou falha. Nenhuma URL de busca é obrigatória.
  if (results.length === 0) {
    try {
      results = await searchWithDuckDuckGo(req);
      usedProvider = "duckduckgo";
    } catch (err) {
      console.warn("DuckDuckGo falhou:", err);
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
