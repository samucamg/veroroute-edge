/** Bounded upstream operation, including stream lifetime. Never retry after bytes reach the client. */
export class UpstreamTimeout extends Error { constructor() { super("Upstream deadline exceeded"); } }
export async function withDeadline(
  task: (signal: AbortSignal) => Promise<Response>, timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout>;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { timedOut = true; controller.abort(); reject(new UpstreamTimeout()); }, timeoutMs);
  });
  // Attach rejection handling even while the consumer is between reads.
  void expired.catch(() => {});
  try {
    const response = await Promise.race([task(controller.signal).then(async response => {
      if (timedOut) { await response.body?.cancel().catch(() => {}); throw new UpstreamTimeout(); }
      return response;
    }), expired]);
    if (!response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
      clearTimeout(timer!);
      return response;
    }
    const reader = response.body.getReader();
    const body = new ReadableStream<Uint8Array>({
      async pull(out) {
        try {
          const result = await Promise.race([reader.read(), expired]);
          if (result.done) { clearTimeout(timer!); reader.releaseLock(); out.close(); }
          else out.enqueue(result.value);
        } catch {
          clearTimeout(timer!); controller.abort();
          void reader.cancel().catch(() => {});
          out.error(new Error("Upstream stream interrupted"));
        }
      },
      cancel() { clearTimeout(timer!); controller.abort(); return reader.cancel().catch(() => {}); }
    });
    return new Response(body, {status: response.status, headers: response.headers});
  } catch (error) { clearTimeout(timer!); controller.abort(); throw error; }
}
export function boundedInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number(value);
  return value !== undefined && Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : fallback;
}
export function publicUpstreamError(status = 502): Response {
  return Response.json({error: {type: "upstream_error", message: "Nao foi possivel concluir a solicitacao ao provedor.", status}}, {status});
}
