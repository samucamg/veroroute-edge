import type { SearchRequest, SearchResultItem } from "@/types/search";

/**
 * Driver para DuckDuckGo HTML Search (Gratuito, sem chave de API)
 *
 * FIX 4: Usa html.duckduckgo.com/html em vez da Instant Answers API
 * (api.duckduckgo.com retorna apenas respostas de dicionário/Wikipedia,
 * não resultados de busca web reais).
 *
 * Suporta SearXNG como provider primário quando SEARXNG_URL estiver configurado —
 * o DuckDuckGo HTML atua como fallback gratuito.
 */
export async function searchWithDuckDuckGo(req: SearchRequest): Promise<SearchResultItem[]> {
  const params = new URLSearchParams({ q: req.query });
  const url = "https://html.duckduckgo.com/html/?" + params.toString();

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  if (!res.ok) {
    throw new Error("DuckDuckGo HTML erro HTTP " + res.status);
  }

  const html = await res.text();
  const results: SearchResultItem[] = [];

  // Extrai pares (título + url) da classe result__a
  const titleRe = /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  const snippetRe = /class="result__snippet"[^>]*>[\s\S]*?<\/a>/g;

  const titleMatches: { url: string; title: string }[] = [];
  let m: RegExpExecArray | null;

  while ((m = titleRe.exec(html)) !== null) {
    let href = m[1].replace(/&amp;/g, "&");
    let url = href;
    try {
      if (href.startsWith("//")) href = "https:" + href;
      const u = new URL(href);
      const uddg = u.searchParams.get("uddg");
      if (uddg) url = decodeURIComponent(uddg);
    } catch {}
    const title = m[2].replace(/<[^>]+>/g, "").trim();
    if (title && url.startsWith("http")) {
      titleMatches.push({ url, title });
    }
  }

  const snippetMatches: string[] = [];
  while ((m = snippetRe.exec(html)) !== null) {
    const text = m[0].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    snippetMatches.push(text);
  }

  for (let i = 0; i < titleMatches.length; i++) {
    results.push({
      title: titleMatches[i].title,
      url: titleMatches[i].url,
      content: snippetMatches[i] ?? "",
      engine: "duckduckgo",
    });
  }

  const limit = req.limit || 5;
  return results.slice(0, limit);
}
