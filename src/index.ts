import { Hono } from "hono";
import { cors } from "hono/cors";
import { DEFAULT_MODELS_CATALOG } from "./config/constants";
import { formatAnthropicToOpenAI, formatOpenAIToAnthropic, createOpenAIToAnthropicTransformStream } from "./adapters/anthropic";
import { applyContextCompression } from "./compression/pipeline";
import { applyModalityBridge } from "./modality/bridge";
import { dispatchWithCascade } from "./routing/cascade";
import { augmentRequestWithWebSearch, dispatchSearch } from "./search/dispatcher";
import { fetchWithJinaReader } from "./search/jina";
import {
  exchangeAntigravityCode,
  getAntigravityAuthUrl,
} from "./oauth/antigravity";
import { executeMcpTool, handleMcpSse, MCP_TOOLS_LIST } from "./mcp/server";
import { renderDashboardHtml } from "./ui/dashboard";
import type { AnthropicMessagesRequest } from "./types/anthropic";
import type { ChatCompletionRequest, ChatCompletionResponse } from "./types/openai";
import type { EnvBindings } from "./types/provider";
import type { SearchRequest } from "./types/search";

const app = new Hono<{ Bindings: EnvBindings }>();

// Middleware de CORS aberto para acesso por IDEs e clientes Web
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["*"],
    exposeHeaders: ["*"],
  })
);

// Middleware de Autenticação (Opcional se AUTH_TOKEN estiver configurado)
app.use("/v1/*", async (c, next) => {
  const authToken = c.env.AUTH_TOKEN;
  if (authToken) {
    const authHeader = c.req.header("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token !== authToken) {
      return c.json({ error: { message: "Não autorizado (AUTH_TOKEN inválido)", status: 401 } }, 401);
    }
  }
  await next();
});

// Suporte a VS Code Token Aliases: /api/v1/vscode/:token/* -> reescreve rota internamente
app.all("/api/v1/vscode/:token/*", async (c) => {
  const path = c.req.path.replace(/^\/api\/v1\/vscode\/[^\/]+/, "/v1");
  const url = new URL(c.req.url);
  url.pathname = path;
  const newReq = new Request(url.toString(), c.req.raw);
  return app.fetch(newReq, c.env, c.executionCtx);
});

// --- ROTA RAIZ: DASHBOARD MODERNO GLASSMORPHISM ---
app.get("/", (c) => {
  return c.html(renderDashboardHtml());
});

// --- STATUS & HEALTH CHECK ---
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    engine: "veroroute-edge",
    version: "1.0.0",
    architecture: "Cloudflare Workers Serverless",
    inspiration: "OmniRoute & VeroRoute",
    timestamp: new Date().toISOString(),
  });
});

// --- OPENAI SPEC: GET /v1/models ---
app.get("/v1/models", (c) => {
  return c.json({
    object: "list",
    data: DEFAULT_MODELS_CATALOG.map((m) => ({
      id: m.id,
      object: "model",
      created: 1710000000,
      owned_by: m.owned_by,
      permission: [],
      root: m.id,
      parent: null,
      pricing: m.pricing,
      context_length: m.context_length,
    })),
  });
});

// --- OPENAI SPEC: POST /v1/chat/completions ---
app.post("/v1/chat/completions", async (c) => {
  try {
    let body = (await c.req.json()) as ChatCompletionRequest;

    // 1. Ponte de Modalidade (adapta imagens para modelos text-only se necessário)
    if (c.env.ENABLE_MODALITY_BRIDGE !== "false") {
      body = await applyModalityBridge(body, c.env);
    }

    // 2. Busca Web e Injeção de RAG (se solicitada no request ou configurada)
    body = await augmentRequestWithWebSearch(body, c.env);

    // 3. Pipeline de Compressão de Contexto e Estilos de Saída
    if (c.env.ENABLE_CONTEXT_COMPRESSION !== "false") {
      body = applyContextCompression(body, body.output_style || c.env.DEFAULT_OUTPUT_STYLE);
    }

    // 4. Despacho com Cascata de Fallback Inteligente (20 estratégias)
    return await dispatchWithCascade(body, c.env);
  } catch (err: any) {
    return c.json(
      {
        error: {
          message: `Erro no processamento do VeroRoute Edge: ${err.message || String(err)}`,
          type: "gateway_error",
        },
      },
      500
    );
  }
});

// --- ANTHROPIC SPEC: POST /v1/messages ---
// Compatibilidade nativa com Claude Code CLI, Cline, Roo Code
app.post("/v1/messages", async (c) => {
  try {
    const anthropicReq = (await c.req.json()) as AnthropicMessagesRequest;

    // Tradução de Anthropic Messages para formato OpenAI
    let openAiReq = formatAnthropicToOpenAI(anthropicReq);

    // Aplica pontes e compressão
    if (c.env.ENABLE_MODALITY_BRIDGE !== "false") {
      openAiReq = await applyModalityBridge(openAiReq, c.env);
    }
    if (c.env.ENABLE_CONTEXT_COMPRESSION !== "false") {
      openAiReq = applyContextCompression(openAiReq, c.env.DEFAULT_OUTPUT_STYLE);
    }

    const response = await dispatchWithCascade(openAiReq, c.env);

    // Se for streaming, adapta os chunks SSE de OpenAI de volta para o formato Anthropic
    if (anthropicReq.stream && response.ok && response.body) {
      const transform = createOpenAIToAnthropicTransformStream(anthropicReq.model);
      const transformedStream = response.body.pipeThrough(transform);
      return new Response(transformedStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Modo síncrono
    if (response.ok) {
      const openAiJson = (await response.json()) as ChatCompletionResponse;
      const anthropicJson = formatOpenAIToAnthropic(openAiJson);
      return c.json(anthropicJson);
    }

    return response;
  } catch (err: any) {
    return c.json(
      {
        type: "error",
        error: { type: "api_error", message: err.message || String(err) },
      },
      500
    );
  }
});

// --- OPENAI RESPONSES API: POST /v1/responses ---
app.post("/v1/responses", async (c) => {
  const body = (await c.req.json()) as any;
  const chatReq: ChatCompletionRequest = {
    model: body.model,
    messages: body.input ? [{ role: "user", content: body.input }] : body.messages || [],
    temperature: body.temperature,
    max_tokens: body.max_output_tokens || body.max_tokens,
    stream: body.stream,
  };
  return await dispatchWithCascade(chatReq, c.env);
});

// --- BUSCA WEB: POST /v1/search ---
app.post("/v1/search", async (c) => {
  try {
    const body = (await c.req.json()) as SearchRequest;
    if (!body.query) {
      return c.json({ error: { message: "Parâmetro 'query' é obrigatório" } }, 400);
    }
    const results = await dispatchSearch(body, c.env);
    return c.json(results);
  } catch (err: any) {
    return c.json({ error: { message: err.message } }, 500);
  }
});

// --- JINA READER WEB FETCH: POST /v1/web/fetch ---
app.post("/v1/web/fetch", async (c) => {
  try {
    const body = (await c.req.json()) as { url: string };
    if (!body.url) return c.json({ error: { message: "Parâmetro 'url' é obrigatório" } }, 400);
    const result = await fetchWithJinaReader(body.url);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: { message: err.message } }, 500);
  }
});

// --- FLUXO OAUTH: ANTIGRAVITY CLI / GOOGLE CLOUD CODE ASSIST ---
app.get("/api/oauth/antigravity/authorize", (c) => {
  const url = new URL(c.req.url);
  const redirectUri = `${url.origin}/api/oauth/antigravity/callback`;
  const authUrl = getAntigravityAuthUrl(redirectUri);
  return c.redirect(authUrl);
});

app.get("/api/oauth/antigravity/callback", async (c) => {
  const code = c.req.query("code");
  if (!code) {
    return c.text("Código de autorização não fornecido pelo Google.", 400);
  }

  const url = new URL(c.req.url);
  const redirectUri = `${url.origin}/api/oauth/antigravity/callback`;

  try {
    const tokens = await exchangeAntigravityCode(code, redirectUri, c.env.ANTIGRAVITY_CLIENT_SECRET);
    if (c.env.OMNI_KEYS) {
      await c.env.OMNI_KEYS.put("antigravity_tokens", JSON.stringify(tokens));
    }
    return c.html(`
      <html>
        <body style="font-family:sans-serif; background:#0b0f19; color:#fff; padding:2rem; text-align:center;">
          <h2 style="color:#10b981;">✅ Antigravity Conectado com Sucesso!</h2>
          <p style="color:#94a3b8; margin:1rem 0;">Projeto Companion: <code>${tokens.project_id || "Detectado automaticamente"}</code></p>
          <a href="/" style="color:#38bdf8; text-decoration:none;">⬅ Voltar ao Dashboard do VeroRoute Edge</a>
        </body>
      </html>
    `);
  } catch (err: any) {
    return c.text(`Erro na troca de token do Antigravity: ${err.message}`, 500);
  }
});

// --- IMPORTAÇÃO MANUAL DE CREDENCIAIS ANTIGRAVITY ---
app.post("/api/oauth/antigravity/import", async (c) => {
  const body = (await c.req.json()) as { token: string };
  if (!body.token) return c.json({ ok: false, error: "Token vazio" }, 400);

  let refreshToken = body.token.trim();
  let projectId = "";

  // Se o usuário colou o JSON completo do Antigravity
  if (refreshToken.startsWith("{")) {
    try {
      const parsed = JSON.parse(refreshToken);
      refreshToken = parsed.refresh_token || parsed.token || "";
      projectId = parsed.project_id || parsed.cloudaicompanionProject || "";
    } catch {}
  }

  if (c.env.OMNI_KEYS) {
    await c.env.OMNI_KEYS.put(
      "antigravity_tokens",
      JSON.stringify({
        refresh_token: refreshToken,
        project_id: projectId,
        expires_at: 0, // Força renovação na primeira chamada
      })
    );
  }

  return c.json({ ok: true, message: "Credenciais do Antigravity salvas no KV" });
});

// --- SERVIDOR MCP: SSE & TOOLS ---
app.get("/api/mcp/sse", (c) => {
  return handleMcpSse(c.env);
});

app.post("/api/mcp/messages", async (c) => {
  const body = (await c.req.json()) as any;
  if (body.method === "tools/list") {
    return c.json({
      jsonrpc: "2.0",
      id: body.id,
      result: { tools: MCP_TOOLS_LIST },
    });
  }
  if (body.method === "tools/call") {
    try {
      const res = await executeMcpTool(body.params.name, body.params.arguments, c.env);
      return c.json({ jsonrpc: "2.0", id: body.id, result: res });
    } catch (e: any) {
      return c.json({ jsonrpc: "2.0", id: body.id, error: { message: e.message } }, 500);
    }
  }
  return c.json({ jsonrpc: "2.0", id: body.id, result: {} });
});

export default app;
