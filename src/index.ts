import { Hono } from "hono";
import { cors } from "hono/cors";
import { DEFAULT_MODELS_CATALOG } from "./config/constants";
import { formatAnthropicToOpenAI, createOpenAIToAnthropicTransformStream } from "./adapters/anthropic";
import { applyContextCompression } from "./compression/pipeline";
import { applyModalityBridge } from "./modality/bridge";
import { dispatchWithCascade } from "./routing/cascade";
import { augmentRequestWithWebSearch, dispatchSearch } from "./search/dispatcher";
import { fetchWithJinaReader } from "./search/jina";
import { handleGenerateImages, handleEditImages } from "./adapters/images";
import { handleAudioSpeech, handleAudioTranscriptions, handleAudioTranslations } from "./adapters/audio";
import { exchangeAntigravityCode, getAntigravityAuthUrl } from "./oauth/antigravity";
import { executeMcpTool, handleMcpSse, MCP_TOOLS_LIST } from "./mcp/server";
import { renderDashboardHtml } from "./ui/dashboard";
import { adminRouter } from "./admin/routes";
import {
  extractBearer,
  resolvePrincipal,
  unauthorized,
  serverMisconfigured,
  forbidden,
  isModelAllowed,
  recordVirtualKeyUse,
} from "./admin/auth";
import { getAdminConfig, getAntigravityOAuthCredentials } from "./admin/store";
import type { AnthropicMessagesRequest } from "./types/anthropic";
import type { ChatCompletionRequest } from "./types/openai";
import type { EnvBindings } from "./types/provider";
import type { SearchRequest } from "./types/search";

type Variables = { principal: import("./admin/auth").AuthPrincipal };
const app = new Hono<{ Bindings: EnvBindings; Variables: Variables }>();

// ---------------------------------------------------------------------------
// CORS — required for browser clients and IDEs
// ---------------------------------------------------------------------------
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["*"],
    exposeHeaders: ["*"],
  })
);

// ---------------------------------------------------------------------------
// AUTH MIDDLEWARE — /v1/* routes
// Requires AUTH_TOKEN to be configured (fail-closed). Virtual keys respected.
// Sets c.set("principal", ...) for downstream enforcement.
// ---------------------------------------------------------------------------
app.use("/v1/*", async (c, next) => {
  if (!c.env.AUTH_TOKEN) return serverMisconfigured();
  const token = extractBearer(c);
  const principal = await resolvePrincipal(c, token);
  if (!principal) return unauthorized();
  c.set("principal", principal);
  // Record usage non-blocking
  recordVirtualKeyUse(c.env, (p) => c.executionCtx.waitUntil(p as Promise<unknown>), principal);
  return next();
});

// ---------------------------------------------------------------------------
// AUTH MIDDLEWARE — /api/oauth/antigravity/* (admin-only, Bearer required)
// /callback is exempt from auth because Google redirects the browser there.
// /authorize and /import require the admin Bearer.
// ---------------------------------------------------------------------------
app.use("/api/oauth/antigravity/authorize", async (c, next) => {
  if (!c.env.AUTH_TOKEN) return serverMisconfigured();
  const principal = await resolvePrincipal(c, extractBearer(c));
  if (!principal || principal.kind !== "master") return unauthorized("Apenas o admin pode iniciar o fluxo OAuth");
  return next();
});

app.use("/api/oauth/antigravity/import", async (c, next) => {
  if (!c.env.AUTH_TOKEN) return serverMisconfigured();
  const principal = await resolvePrincipal(c, extractBearer(c));
  if (!principal || principal.kind !== "master") return unauthorized("Apenas o admin pode importar credenciais");
  return next();
});

// ---------------------------------------------------------------------------
// AUTH MIDDLEWARE — /api/mcp/* (requires ENABLE_MCP_SERVER + Bearer)
// ---------------------------------------------------------------------------
app.use("/api/mcp/*", async (c, next) => {
  if (c.env.ENABLE_MCP_SERVER !== "true") {
    return c.json({ error: { message: "Servidor MCP desabilitado. Defina ENABLE_MCP_SERVER=true para habilitar." } }, 404);
  }
  if (!c.env.AUTH_TOKEN) return serverMisconfigured();
  const principal = await resolvePrincipal(c, extractBearer(c));
  if (!principal) return unauthorized();
  return next();
});

// ---------------------------------------------------------------------------
// VS Code token alias: /api/v1/vscode/:token/* → /v1/...
// ---------------------------------------------------------------------------
app.all("/api/v1/vscode/:token/*", async (c) => {
  const path = c.req.path.replace(/^\/api\/v1\/vscode\/[^\/]+/, "/v1");
  const url = new URL(c.req.url);
  url.pathname = path;
  const newReq = new Request(url.toString(), c.req.raw);
  return app.fetch(newReq, c.env, c.executionCtx);
});

// ---------------------------------------------------------------------------
// ROOT — Dashboard
// ---------------------------------------------------------------------------
app.get("/", (c) => c.html(renderDashboardHtml()));

// ---------------------------------------------------------------------------
// Health check (public — only status, no config data)
// ---------------------------------------------------------------------------
app.get("/health", (c) =>
  c.json({
    status: "ok",
    engine: "veroroute-edge",
    version: "1.0.0",
    architecture: "Cloudflare Workers Serverless",
    timestamp: new Date().toISOString(),
  })
);

// ---------------------------------------------------------------------------
// GET /v1/models — A-8: includes dynamic combos from admin config
// ---------------------------------------------------------------------------
app.get("/v1/models", async (c) => {
  const adminCfg = await getAdminConfig(c.env);
  const comboModels = Object.values(adminCfg.combos)
    .filter((cb) => cb.enabled)
    .map((cb) => ({
      id: cb.id,
      object: "model",
      created: 1710000000,
      owned_by: "veroroute-combos",
      description: cb.description,
    }));

  const catalogModels = DEFAULT_MODELS_CATALOG.map((m) => ({
    id: m.id,
    object: "model",
    created: 1710000000,
    owned_by: m.owned_by,
    permission: [],
    root: m.id,
    parent: null,
    pricing: m.pricing,
    context_length: m.context_length,
  }));

  return c.json({ object: "list", data: [...comboModels, ...catalogModels] });
});

// ---------------------------------------------------------------------------
// POST /v1/chat/completions
// ---------------------------------------------------------------------------
app.post("/v1/chat/completions", async (c) => {
  try {
    let body = (await c.req.json()) as ChatCompletionRequest;

    // A-2: enforce allowedModels for virtual keys
    const principal = c.get("principal") as import("./admin/auth").AuthPrincipal | null | undefined;
    if (principal && body.model && !isModelAllowed(principal, body.model)) {
      return forbidden(body.model);
    }

    if (c.env.ENABLE_MODALITY_BRIDGE !== "false") {
      body = await applyModalityBridge(body, c.env);
    }
    body = await augmentRequestWithWebSearch(body, c.env);
    if (c.env.ENABLE_CONTEXT_COMPRESSION !== "false") {
      body = applyContextCompression(body, body.output_style || c.env.DEFAULT_OUTPUT_STYLE);
    }
    const _keyId = (c.get("principal") as { id: string } | null)?.id;
    return await dispatchWithCascade(body, c.env, _keyId ?? undefined);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: { message: msg, type: "internal_error" } }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// ---------------------------------------------------------------------------
// POST /v1/messages (Anthropic native)
// ---------------------------------------------------------------------------
app.post("/v1/messages", async (c) => {
  try {
    const body = (await c.req.json()) as AnthropicMessagesRequest;
    const openAIBody = formatAnthropicToOpenAI(body);
    const stream = body.stream ?? false;
    const _princId = (c.get("principal") as { id: string } | null)?.id;
    const response = await dispatchWithCascade(openAIBody, c.env, _princId ?? undefined);
    if (stream) {
      const transformer = createOpenAIToAnthropicTransformStream(body.model);
      const outStream = response.body ? response.body.pipeThrough(transformer) : null;
      return new Response(outStream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      });
    }
    const data = (await response.json()) as Record<string, unknown>;
    return c.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ type: "error", error: { type: "api_error", message: msg } }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /v1/responses (partial OpenAI Responses API compatibility)
// ---------------------------------------------------------------------------
app.post("/v1/responses", async (c) => {
  const body = (await c.req.json()) as Record<string, unknown>;
  const chatReq: ChatCompletionRequest = {
    model: body.model as string,
    messages: body.input ? [{ role: "user", content: body.input as string }] : (body.messages as ChatCompletionRequest["messages"]) || [],
    temperature: body.temperature as number | undefined,
    max_tokens: (body.max_output_tokens as number | undefined) || (body.max_tokens as number | undefined),
    stream: body.stream as boolean | undefined,
  };
  const _rspKeyId = (c.get("principal") as { id: string } | null)?.id;
  return dispatchWithCascade(chatReq, c.env, _rspKeyId ?? undefined);
});

// ---------------------------------------------------------------------------
// POST /v1/search
// ---------------------------------------------------------------------------
app.post("/v1/search", async (c) => {
  try {
    const body = (await c.req.json()) as SearchRequest;
    if (!body.query) return c.json({ error: { message: "Parâmetro 'query' é obrigatório" } }, 400);
    return c.json(await dispatchSearch(body, c.env));
  } catch (err: unknown) {
    return c.json({ error: { message: err instanceof Error ? err.message : String(err) } }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /v1/web/fetch
// ---------------------------------------------------------------------------
app.post("/v1/web/fetch", async (c) => {
  try {
    const body = (await c.req.json()) as { url: string };
    if (!body.url) return c.json({ error: { message: "Parâmetro 'url' é obrigatório" } }, 400);
    return c.json(await fetchWithJinaReader(body.url));
  } catch (err: unknown) {
    return c.json({ error: { message: err instanceof Error ? err.message : String(err) } }, 500);
  }
});

// ---------------------------------------------------------------------------
// Images & Audio
// ---------------------------------------------------------------------------
app.post("/v1/images/generations", handleGenerateImages);
app.post("/v1/images/edits", handleEditImages);
app.post("/v1/audio/speech", handleAudioSpeech);
app.post("/v1/audio/transcriptions", handleAudioTranscriptions);
app.post("/v1/audio/translations", handleAudioTranslations);

// ---------------------------------------------------------------------------
// OAuth — Antigravity / Google Cloud Code Assist
// /authorize and /import are protected by admin middleware above.
// /callback is public (Google browser redirect) but validates state nonce.
// ---------------------------------------------------------------------------
app.get("/api/oauth/antigravity/authorize", async (c) => {
  const url = new URL(c.req.url);
  const redirectUri = `${url.origin}/api/oauth/antigravity/callback`;
  const { clientId, isConfigured } = await getAntigravityOAuthCredentials(c.env);

  if (!isConfigured || !clientId) {
    return c.html(`<html><body style="font-family:sans-serif;background:#0b0f19;color:#fff;padding:2rem;text-align:center">
      <h2 style="color:#f59e0b">Credenciais OAuth não configuradas</h2>
      <p style="color:#94a3b8">Configure o Client ID e o Client Secret do Google no Painel de Administração (aba Antigravity OAuth).</p>
    </body></html>`, 400);
  }

  // Generate a one-time state nonce (M-5) scoped to this worker isolate session
  const state = crypto.randomUUID();
  if (c.env.OMNI_KEYS) {
    // Store with 10-minute TTL so stale states auto-expire
    await c.env.OMNI_KEYS.put(`oauth_state:${state}`, "1", { expirationTtl: 600 });
  }

  const authUrl = getAntigravityAuthUrl(redirectUri, state, clientId);
  return c.redirect(authUrl);
});

app.get("/api/oauth/antigravity/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");

  if (!code) return c.text("Código de autorização não fornecido pelo Google.", 400);

  // Validate and consume the state nonce (M-5)
  if (c.env.OMNI_KEYS) {
    if (!state) return c.text("Parâmetro state ausente — possível ataque CSRF.", 400);
    const stored = await c.env.OMNI_KEYS.get(`oauth_state:${state}`);
    if (!stored) return c.text("State inválido ou expirado. Inicie o fluxo novamente.", 400);
    await c.env.OMNI_KEYS.delete(`oauth_state:${state}`);
  }

  if (!c.env.OMNI_KEYS) {
    // A-10: explicit error when KV unavailable
    return c.text("OMNI_KEYS não configurado — não é possível persistir tokens OAuth.", 503);
  }

  const url = new URL(c.req.url);
  const redirectUri = `${url.origin}/api/oauth/antigravity/callback`;

  try {
    const { clientId, clientSecret } = await getAntigravityOAuthCredentials(c.env);
    const tokens = await exchangeAntigravityCode(code, redirectUri, clientId, clientSecret);
    await c.env.OMNI_KEYS.put("antigravity_tokens", JSON.stringify(tokens));
    return c.html(`<html><body style="font-family:sans-serif;background:#0b0f19;color:#fff;padding:2rem;text-align:center">
      <h2 style="color:#10b981">✅ Antigravity Conectado com Sucesso!</h2>
      <p style="color:#94a3b8;margin:1rem 0">Projeto: <code>${tokens.project_id ?? "auto"}</code></p>
      <a href="/" style="color:#38bdf8">⬅ Voltar ao Dashboard</a>
    </body></html>`);
  } catch (err: unknown) {
    return c.text(`Erro na troca de token: ${err instanceof Error ? err.message : String(err)}`, 500);
  }
});

app.post("/api/oauth/antigravity/import", async (c) => {
  if (!c.env.OMNI_KEYS) {
    // A-10
    return c.json({ ok: false, error: "OMNI_KEYS não configurado — impossível persistir credenciais." }, 503);
  }

  const body = (await c.req.json()) as { token: string };
  if (!body.token) return c.json({ ok: false, error: "Token vazio" }, 400);

  let refreshToken = body.token.trim();
  let projectId = "";

  if (refreshToken.startsWith("{")) {
    try {
      const parsed = JSON.parse(refreshToken) as Record<string, string>;
      refreshToken = parsed.refresh_token || parsed.token || "";
      projectId = parsed.project_id || parsed.cloudaicompanionProject || "";
    } catch { /* not JSON — use as-is */ }
  }

  await c.env.OMNI_KEYS.put(
    "antigravity_tokens",
    JSON.stringify({ refresh_token: refreshToken, project_id: projectId, expires_at: 0 })
  );
  return c.json({ ok: true, message: "Credenciais do Antigravity salvas no KV" });
});

// ---------------------------------------------------------------------------
// MCP Server — protected by middleware above (ENABLE_MCP_SERVER + Bearer)
// ---------------------------------------------------------------------------
app.get("/api/mcp/sse", (c) => handleMcpSse(c.env));

app.post("/api/mcp/messages", async (c) => {
  const body = (await c.req.json()) as { method: string; id: unknown; params?: { name: string; arguments: Record<string, unknown> } };
  if (body.method === "tools/list") {
    return c.json({ jsonrpc: "2.0", id: body.id, result: { tools: MCP_TOOLS_LIST } });
  }
  if (body.method === "tools/call") {
    try {
      const res = await executeMcpTool(body.params!.name, body.params!.arguments, c.env);
      return c.json({ jsonrpc: "2.0", id: body.id, result: res });
    } catch (e: unknown) {
      return c.json({ jsonrpc: "2.0", id: body.id, error: { message: e instanceof Error ? e.message : String(e) } }, 500);
    }
  }
  return c.json({ jsonrpc: "2.0", id: body.id, result: {} });
});

// ---------------------------------------------------------------------------
// Admin API
// ---------------------------------------------------------------------------
app.route("/api/admin", adminRouter);

export default app;