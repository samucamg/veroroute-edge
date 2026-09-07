import type { SearchRequest, SearchResultItem } from "@/types/search";

/**
 * Adaptador para a Brave Search API (https://api.search.brave.com)
 * Índice de busca 100% independente do Google/Bing. 2.000 requisições/mês gratuitas.
 */
export async function searchWithBrave(
  req: SearchRequest,
  apiKey: string
): Promise<SearchResultItem[]> {
  const count = Math.min(req.limit || 5, 10);
  const endpoint = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(req.query)}&count=${count}`;

  const res = await fetch(endpoint, {
    method: "GET",
    headers: {
      "X-Subscription-Token": apiKey.trim(),
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Brave Search API falhou (${res.status}): ${errText}`);
  }

  const json = (await res.json()) as any;
  const webResults = json.web?.results || [];

  return webResults.slice(0, count).map((item: any) => ({
    title: item.title || "Resultado Brave",
    url: item.url || "",
    content: item.description || "",
  }));
}
