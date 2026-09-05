import type { SearchRequest, SearchResultItem } from "@/types/search";

/**
 * Driver para Tavily Search API (1.000 buscas gratuitas/mês)
 */
export async function searchWithTavily(
  req: SearchRequest,
  apiKey: string
): Promise<SearchResultItem[]> {
  if (!apiKey) throw new Error("Chave de API do Tavily não configurada");

  const body = {
    api_key: apiKey,
    query: req.query,
    search_depth: "basic",
    include_answer: true,
    max_results: req.limit || 5,
    include_domains: req.filters?.include_domains,
    exclude_domains: req.filters?.exclude_domains,
  };

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Tavily erro HTTP ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as any;
  const items: SearchResultItem[] = [];

  if (data.answer) {
    items.push({
      title: "Resumo da Busca (Tavily AI)",
      url: "https://tavily.com",
      content: data.answer,
      engine: "tavily-ai",
    });
  }

  for (const r of data.results || []) {
    items.push({
      title: r.title || "Resultado",
      url: r.url,
      content: r.content || "",
      score: r.score,
      engine: "tavily",
    });
  }

  return items;
}
