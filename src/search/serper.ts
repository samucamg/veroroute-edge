import type { SearchRequest, SearchResultItem } from "@/types/search";

/**
 * Adaptador para o Google Serper Search API (https://serper.dev)
 * Cota gratuita de 2.500 requisições de boas-vindas. Retorna resultados oficiais do Google em JSON.
 */
export async function searchWithSerper(
  req: SearchRequest,
  apiKey: string
): Promise<SearchResultItem[]> {
  const endpoint = "https://google.serper.dev/search";
  const num = Math.min(req.limit || 5, 10);

  const payload = {
    q: req.query,
    num,
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey.trim(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Serper API falhou (${res.status}): ${errText}`);
  }

  const json = (await res.json()) as any;
  const organic = json.organic || [];

  return organic.slice(0, num).map((item: any) => ({
    title: item.title || "Resultado Google",
    url: item.link || "",
    content: item.snippet || "",
  }));
}
