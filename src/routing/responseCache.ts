import type { EnvBindings } from "@/types/provider";
import type { ChatCompletionRequest } from "@/types/openai";

/**
 * Simple response cache using Cloudflare Cache API.
 * Cache key = SHA-256(model + messages + temperature + max_tokens).
 * Only caches non-streaming, deterministic requests (temperature=0 or very low).
 * TTL configurable via CACHE_TTL_SECONDS env var (default: 3600 = 1 hour).
 */

const DEFAULT_TTL = 3600;

async function computeCacheKey(request: ChatCompletionRequest): Promise<string> {
  const payload = JSON.stringify({
    model: request.model,
    messages: request.messages,
    temperature: request.temperature ?? 1,
    max_tokens: request.max_tokens,
    tools: request.tools?.map(t => t.function.name).sort(),
  });
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  const hex = [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
  return `https://cache.veroroute.internal/v1/completions/${hex}`;
}

function isCacheable(request: ChatCompletionRequest): boolean {
  // Only cache non-streaming requests with low temperature (deterministic)
  if (request.stream) return false;
  const temp = request.temperature ?? 1;
  return temp <= 0.1;
}

/**
 * Try to get a cached response. Returns null on miss.
 */
export async function getCachedResponse(
  request: ChatCompletionRequest,
): Promise<Response | null> {
  if (!isCacheable(request)) return null;
  try {
    const cache = caches.default;
    const key = await computeCacheKey(request);
    const cached = await cache.match(new Request(key));
    if (cached) {
      // Add cache hit header
      const body = await cached.text();
      return new Response(body, {
        headers: {
          "Content-Type": "application/json",
          "X-Cache": "HIT",
          "X-Cache-Key": key.split("/").pop() || "",
        },
      });
    }
  } catch { /* cache miss or error */ }
  return null;
}

/**
 * Store a response in cache. Call with ctx.waitUntil to avoid blocking.
 */
export async function cacheResponse(
  request: ChatCompletionRequest,
  response: Response,
  env: EnvBindings,
): Promise<void> {
  if (!isCacheable(request)) return;
  try {
    const cache = caches.default;
    const key = await computeCacheKey(request);
    const ttl = parseInt((env as any).CACHE_TTL_SECONDS || "", 10) || DEFAULT_TTL;
    const body = await response.clone().text();
    const cacheResp = new Response(body, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${ttl}`,
        "X-Cache": "MISS",
      },
    });
    await cache.put(new Request(key), cacheResp);
  } catch { /* cache store error — non-fatal */ }
}
