export interface ProviderCredential {
  apiKey: string;
  proxyUrl?: string;
}

export function validateProxyUrl(proxyUrl: string): void {
  resolveProxyRequestUrl("https://example.com", proxyUrl);
}

export function resolveProxyRequestUrl(upstreamUrl: string, proxyUrl?: string): string {
  if (!proxyUrl) return upstreamUrl;
  const trimmed = proxyUrl.trim();
  const parsed = new URL(trimmed.replace("{url}", encodeURIComponent(upstreamUrl)));
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Proxy URL must use HTTP or HTTPS");
  }
  if (parsed.username || parsed.password) throw new Error("Proxy URL must not contain embedded credentials");
  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host === "0.0.0.0" || host === "::1" || host.endsWith(".local") || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host) || /^172\.(1[6-9]|2[0-9]|3[01])\./.test(host)) {
    throw new Error("Proxy URL cannot target a private or local address");
  }
  if (!trimmed.includes("{url}")) parsed.searchParams.set("url", upstreamUrl);
  return parsed.toString();
}

export function proxyFetch(upstreamUrl: string, init?: RequestInit, proxyUrl?: string): Promise<Response> {
  return fetch(resolveProxyRequestUrl(upstreamUrl, proxyUrl), init);
}
