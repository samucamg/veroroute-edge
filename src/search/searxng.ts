import type { SearchRequest, SearchResultItem } from "@/types/search";

/**
 * Driver para instâncias SearXNG configuradas pelo usuário
 */
export async function searchWithSearXNG(
  req: SearchRequest,
  baseUrl?: string
): Promise<SearchResultItem[]> {
  if (!baseUrl || baseUrl.trim() === "") {
    throw new Error("URL da instância SearXNG não configurada");
  }

  const cleanBase = baseUrl.trim().replace(/\/+$/, "");
  const params = new URLSearchParams({
    q: req.query,
    format: "json",
    categories: req.search_type === "news" ? "news" : "general",
  });

  if (req.language) params.set("language", req.language);
  if (req.time_range && req.time_range !== "any") params.set("time_range", req.time_range);

  const targetUrl = `${cleanBase}/search?${params.toString()}`;

  const res = await fetch(targetUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "VeroRoute-Edge/1.0",
    },
  });

  if (!res.ok) {
    throw new Error(`SearXNG erro HTTP ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    results?: Array<{
      title: string;
      url: string;
      content: string;
      publishedDate?: string;
      score?: number;
      engine?: string;
    }>;
  };

  const limit = req.limit || 5;
  const items = (data.results || []).slice(0, limit).map((r) => ({
    title: r.title || "Sem título",
    url: r.url,
    content: r.content || "",
    published_date: r.publishedDate,
    score: r.score,
    engine: r.engine || "searxng",
  }));

  return items;
}
