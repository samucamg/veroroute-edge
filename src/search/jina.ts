import type { WebFetchResponse } from "@/types/search";

/**
 * Driver para Jina Reader (Converte URLs em Markdown limpo gratuito)
 */
export async function fetchWithJinaReader(targetUrl: string): Promise<WebFetchResponse> {
  const cleanTarget = targetUrl.trim();
  const jinaUrl = `https://r.jina.ai/${cleanTarget}`;

  const res = await fetch(jinaUrl, {
    headers: {
      Accept: "text/markdown",
      "X-Return-Format": "markdown",
      "User-Agent": "OmniRoute-Serverless/1.0",
    },
  });

  if (!res.ok) {
    throw new Error(`Jina Reader erro HTTP ${res.status}`);
  }

  const markdownContent = await res.text();
  const firstLine = markdownContent.split("\n")[0] || "Conteúdo Web";
  const title = firstLine.replace(/^#+\s*/, "").slice(0, 80);

  return {
    url: cleanTarget,
    title,
    content: markdownContent,
    status: res.status,
  };
}
