/**
 * Tipos e interfaces para o ecossistema de Busca Web e RAG (/v1/search e /v1/web/fetch)
 */

export interface SearchRequest {
  query: string;
  provider?: "searxng" | "duckduckgo" | "tavily" | "serper" | "auto";
  limit?: number;
  search_type?: "web" | "news";
  country?: string;
  language?: string;
  time_range?: "any" | "day" | "week" | "month" | "year";
  filters?: {
    include_domains?: string[];
    exclude_domains?: string[];
  };
}

export interface SearchResultItem {
  title: string;
  url: string;
  content: string;
  snippet?: string;
  published_date?: string;
  score?: number;
  engine?: string;
}

export interface SearchResponse {
  query: string;
  provider: string;
  took_ms: number;
  results: SearchResultItem[];
  total_results: number;
}

export interface WebFetchResponse {
  url: string;
  title: string;
  content: string; // Markdown limpo
  status: number;
}
