<p align="center">
  <a href="#português"><img src="https://flagcdn.com/w40/br.png" alt="Português" /></a>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <a href="#english"><img src="https://flagcdn.com/w40/us.png" alt="English" /></a>
</p>

---

<a name="português"></a>

# ⚡ VeroRoute Edge — Gateway de IA Serverless & Roteador Inteligente

> **The Aerodynamic, Zero-Weight Edge AI Router.**
> Uma alternativa ultra-leve, 100% serverless e de alta velocidade para **Cloudflare Workers**, inspirada no ecossistema e robustez de estratégias do **OmniRoute** e na arquitetura de economia de tokens do **VeroRoute**.

---

## 🌟 O que é o VeroRoute Edge?

O **VeroRoute Edge** é um Gateway Unificado de IA e Roteador Inteligente projetado para rodar nativamente na borda global da **Cloudflare (V8 Isolates)**. Ele elimina a necessidade de infraestruturas pesadas com múltiplos containers Docker, Redis e bancos de dados locais, oferecendo uma camada de proxy de baixíssima latência (< 15ms) com:

- 🚀 **Zero Servidores Físicos**: Roda 100% na rede edge da Cloudflare com auto-scaling instantâneo.
- 🔄 **Cascata de Resiliência & Auto-Fallback**: Se um provedor retornar HTTP 429 (Rate Limit), erro 5xx ou timeout, o próximo assume automaticamente de forma transparente.
- 🔑 **Pool de Chaves & Round-Robin**: Distribui requisições entre múltiplas chaves de API com detecção de cooldown **persistido no Cloudflare KV** (compartilhado entre todos os isolates globais).
- 🔐 **Antigravity CLI (`agy`) OAuth Nativo**: Conecte sua conta Google para utilizar os modelos do Google Cloud Code Assist (Gemini 2.5 Pro e Claude 3.7 Sonnet) com renovação automática de token.
- 🎭 **Compatibilidade Dupla (OpenAI + Anthropic)**:
  - Endpoints padrão OpenAI: `POST /v1/chat/completions`, `GET /v1/models`, `POST /v1/responses`.
  - Endpoint nativo Anthropic: `POST /v1/messages` (compatível com **Claude Code CLI**, **Cline**, **Cursor** e **Roo Code**).
  - Streaming SSE com suporte completo a **tool_calls** na ponte OpenAI ↔ Anthropic.
- 🗜️ **Pipeline de Compressão de Contexto**: Reduz o uso de tokens com deduplicação inteligente de mensagens entre turnos (`session-dedup`), limpeza de logs de terminal (`rtk`) e compactação de espaços (`lite`). Mensagens de ferramentas são blindadas contra deduplicação para evitar erros de `tool_call_id mismatch`.
- 🎨 **Estilos de Saída (Output Personas)**: Injeção automática de personas: *Prosa Concisa*, *YAGNI (menos código)*, *Ponytail (lazy dev)* e *Action-first*.
- 🔍 **Busca Web em Tempo Real (RAG Integrado)**: Suporte unificado a **SearXNG** (conectando à sua VPS), **DuckDuckGo HTML** (sem chave), **Tavily Search** e **Jina Reader** (`r.jina.ai`).
- 🎨 **Ponte de Modalidade (Modality Bridge)**: Transcrição automática de imagens para modelos text-only via Gemini Flash ou Workers AI.

---

## 📐 Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│               Cloudflare Global Network (Edge PoPs)                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─── VeroRoute Edge Worker (V8 Isolate, ~204 KiB gzip) ────────┐  │
│  │  [Auth Middleware] → [Compression Pipeline] → [Modality Bridge]│  │
│  │         ▼                                                      │  │
│  │  ┌─────────────────────────────────────────────┐               │  │
│  │  │       🔄 Cascata de Resiliência             │               │  │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────────┐ │               │  │
│  │  │  │ Gemini  │→ │  Groq   │→ │Cloudflare AI│ │               │  │
│  │  │  └─────────┘  └─────────┘  └─────────────┘ │               │  │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────────┐ │               │  │
│  │  │  │Cerebras │  │ OpenAI  │  │ Antigravity │ │               │  │
│  │  │  └─────────┘  └─────────┘  └─────────────┘ │               │  │
│  │  └─────────────────────────────────────────────┘               │  │
│  │  KV: [OMNI_CACHE (cooldowns)] [OMNI_KEYS (chaves extras)]     │  │
│  └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Endpoints

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/` | Dashboard Glassmorphism embutido |
| `GET` | `/health` | Health check |
| `GET` | `/v1/models` | Lista de modelos disponíveis (OpenAI spec) |
| `POST` | `/v1/chat/completions` | Chat completion com roteamento inteligente |
| `POST` | `/v1/messages` | Endpoint nativo Anthropic (Claude Code CLI, Cline, Cursor) |
| `POST` | `/v1/responses` | OpenAI Responses API |
| `POST` | `/v1/search` | Busca web unificada (SearXNG → DuckDuckGo → Tavily) |
| `POST` | `/v1/web/fetch` | Extração de URL via Jina Reader |
| `GET` | `/api/mcp/sse` | Servidor MCP via SSE |
| `POST` | `/api/mcp/messages` | Servidor MCP via RPC |
| `GET` | `/api/oauth/antigravity/start` | Início do fluxo OAuth Google/Code Assist |

---

## 🚀 Deploy Rápido

### Pré-requisitos

- Conta na [Cloudflare](https://dash.cloudflare.com) (plano gratuito funciona)
- [Node.js](https://nodejs.org) >= 18
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

### 1. Clone o repositório

```bash
git clone https://github.com/samucamg/veroroute-edge.git
cd veroroute-edge
npm install
```

### 2. Crie os KV Namespaces na Cloudflare

```bash
npx wrangler kv:namespace create OMNI_CACHE
npx wrangler kv:namespace create OMNI_KEYS
```

Copie os IDs gerados e preencha no `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  { "binding": "OMNI_CACHE", "id": "SEU_ID_AQUI" },
  { "binding": "OMNI_KEYS",  "id": "SEU_ID_AQUI" }
]
```

### 3. Configure as variáveis de ambiente

```bash
cp .dev.vars.example .dev.vars
```

```ini
AUTH_TOKEN=seu-token-secreto
GEMINI_API_KEYS=AIza...,AIza...
GROQ_API_KEYS=gsk_...
CEREBRAS_API_KEYS=csk-...
SEARXNG_URL=https://sua-instancia-searxng.seudominio.com
TAVILY_API_KEY=tvly-...
JINA_API_KEY=jina_...
```

Para produção:

```bash
npx wrangler secret put AUTH_TOKEN
npx wrangler secret put GEMINI_API_KEYS
```

### 4. Desenvolvimento local

```bash
npx wrangler dev
```

### 5. Deploy para produção

```bash
npx wrangler deploy
```

---

## 🔍 Configuração do SearXNG (Busca Web)

O **SearXNG** é um meta-buscador open-source que agrega resultados de dezenas de engines sem tracking. Cascata de busca: **SearXNG → DuckDuckGo HTML → Tavily**.

### Opção A: Docker Compose (Recomendado)

```yaml
version: "3.8"
services:
  searxng:
    image: searxng/searxng:latest
    restart: unless-stopped
    ports:
      - "8888:8080"
    volumes:
      - ./searxng-data:/etc/searxng
    environment:
      - SEARXNG_BASE_URL=https://search.seudominio.com/
    cap_drop: [ALL]
    cap_add: [CHOWN, SETGID, SETUID]
```

Habilite JSON no `settings.yml`:

```yaml
search:
  formats: [html, json]  # ← Fundamental para o VeroRoute Edge
```

```bash
docker compose up -d
curl "http://localhost:8888/search?q=teste&format=json" | jq '.results[:2]'
```

### Opção B: Cloudflare Tunnel (Zero Trust)

```bash
cloudflared tunnel login
cloudflared tunnel create searxng-veroroute
cloudflared tunnel route dns searxng-veroroute search.seudominio.com
cloudflared tunnel --url http://localhost:8888 run searxng-veroroute
```

### Opção C: Instâncias públicas (somente para testes)

```ini
SEARXNG_URL=https://searx.be
```

---

## 🎯 Combos de Roteamento

| Combo | Descrição | Provedores |
| :--- | :--- | :--- |
| `omni-free` | Máxima economia, zero custo | Gemini 2.5 Flash → Groq → Cerebras → CF Workers AI → OpenRouter → Pollinations |
| `omni-code` | Otimizado para codificação | Antigravity Gemini 2.5 Pro → Qwen 2.5 Coder → Groq → Cerebras |
| `omni-fast` | Velocidade máxima (>500 t/s) | Cerebras (P2C) + Groq (P2C) |

```bash
curl -X POST https://seu-worker.workers.dev/v1/chat/completions \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model": "omni-free", "messages": [{"role": "user", "content": "Olá!"}]}'
```

---

## ⚙️ Estratégias de Roteamento

| Estratégia | Descrição |
| :--- | :--- |
| `priority` | (Padrão) Executa na ordem definida com fallback em cascata |
| `round-robin` | Distribui requisições igualmente entre provedores |
| `p2c` | Power of Two Choices — seleciona o menos carregado de 2 candidatos aleatórios |
| `least-used` | Escolhe o provedor com menos uso acumulado na sessão |
| `cost` | Prioriza provedores com menor custo por token |
| `fastest` | Escolhe o provedor com menor latência histórica |
| `weighted` | Balanceamento ponderado por peso configurado |
| `session-affinity` | Fixa a sessão num provedor específico |

---

## 📋 Changelog — Correções de Auditoria (v1.1.0)

### 🔴 Fix 1: URL do Gemini REST API corrigida
**Arquivo**: `src/adapters/openai-compatible.ts` — URL non-streaming usava `&key=` em vez de `?key=`.

### 🔴 Fix 2: Deduplicação blindada para mensagens de ferramentas
**Arquivo**: `src/compression/pipeline.ts` — Mensagens `role: "tool"` agora são sempre preservadas.

### 🟡 Fix 3: Streaming SSE Anthropic robusto com suporte a tool_calls
**Arquivo**: `src/adapters/anthropic.ts` — Buffer acumulador de linha + eventos de ferramenta completos.

### 🟡 Fix 4: DuckDuckGo agora faz busca web real
**Arquivo**: `src/search/duckduckgo.ts` — Migrado para `html.duckduckgo.com/html/`.

### 🟢 Fix 5: Cooldown de chaves 429 persistido no Cloudflare KV
**Arquivo**: `src/routing/keyPool.ts` + `cascade.ts` — Cache dual com TTL e sincronização global.

---

## 📄 Licença

MIT — Use, modifique e distribua livremente.

---

<a name="english"></a>

# ⚡ VeroRoute Edge — Serverless AI Gateway & Smart Router

> **The Aerodynamic, Zero-Weight Edge AI Router.**
> An ultra-lightweight, 100% serverless, high-speed alternative for **Cloudflare Workers**, inspired by the **OmniRoute** ecosystem and the token-efficiency architecture of **VeroRoute**.

---

## 🌟 What is VeroRoute Edge?

**VeroRoute Edge** is a Unified AI Gateway and Smart Router designed to run natively on **Cloudflare's global edge (V8 Isolates)**. It eliminates the need for heavy infrastructure with multiple Docker containers, Redis and local databases, offering a sub-15ms latency proxy layer with:

- 🚀 **Zero Physical Servers**: Runs 100% on Cloudflare's edge network with instant auto-scaling.
- 🔄 **Resilience Cascade & Auto-Fallback**: If a provider returns HTTP 429 (Rate Limit), 5xx error or timeout, the next one takes over automatically and transparently.
- 🔑 **Key Pool & Round-Robin**: Distributes requests across multiple API keys with cooldown detection **persisted in Cloudflare KV** (shared across all global isolates).
- 🔐 **Antigravity CLI (`agy`) Native OAuth**: Connect your Google account to use Google Cloud Code Assist models (Gemini 2.5 Pro and Claude 3.7 Sonnet) with automatic token renewal.
- 🎭 **Dual Compatibility (OpenAI + Anthropic)**:
  - Standard OpenAI endpoints: `POST /v1/chat/completions`, `GET /v1/models`, `POST /v1/responses`.
  - Native Anthropic endpoint: `POST /v1/messages` (compatible with **Claude Code CLI**, **Cline**, **Cursor** and **Roo Code**).
  - SSE Streaming with full **tool_calls** support on the OpenAI ↔ Anthropic bridge.
- 🗜️ **Context Compression Pipeline**: Reduces token usage with intelligent message deduplication between turns (`session-dedup`), terminal log cleanup (`rtk`) and whitespace compression (`lite`). Tool messages (`role: "tool"`) are shielded from deduplication to prevent `tool_call_id mismatch` errors.
- 🎨 **Output Styles (Output Personas)**: Automatic persona injection: *Concise Prose*, *YAGNI (less code)*, *Ponytail (lazy dev)* and *Action-first*.
- 🔍 **Real-Time Web Search (Integrated RAG)**: Unified support for **SearXNG** (connecting to your VPS), **DuckDuckGo HTML** (no key required), **Tavily Search** and **Jina Reader** (`r.jina.ai`).
- 🎨 **Modality Bridge**: Automatic image-to-text transcription for text-only models via Gemini Flash or Workers AI.

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│               Cloudflare Global Network (Edge PoPs)                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─── VeroRoute Edge Worker (V8 Isolate, ~204 KiB gzip) ────────┐  │
│  │                                                                │  │
│  │  [Auth Middleware] → [Compression Pipeline] → [Modality Bridge]│  │
│  │         │                                                      │  │
│  │         ▼                                                      │  │
│  │  ┌─────────────────────────────────────────────┐               │  │
│  │  │       🔄 Resilience Cascade                 │               │  │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────────┐ │               │  │
│  │  │  │ Gemini  │→ │  Groq   │→ │Cloudflare AI│ │               │  │
│  │  │  │  REST   │  │  (API)  │  │  (Workers)  │ │               │  │
│  │  │  └─────────┘  └─────────┘  └─────────────┘ │               │  │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────────┐ │               │  │
│  │  │  │Cerebras │  │ OpenAI  │  │ Antigravity │ │               │  │
│  │  │  │  (API)  │  │ Azure   │  │ OAuth/GCP   │ │               │  │
│  │  │  └─────────┘  └─────────┘  └─────────────┘ │               │  │
│  │  └─────────────────────────────────────────────┘               │  │
│  │                                                                │  │
│  │  KV: [OMNI_CACHE (cooldowns)] [OMNI_KEYS (extra keys)]        │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Endpoints

| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Embedded Glassmorphism Dashboard |
| `GET` | `/health` | Health check |
| `GET` | `/v1/models` | Available models list (OpenAI spec) |
| `POST` | `/v1/chat/completions` | Chat completion with smart routing |
| `POST` | `/v1/messages` | Native Anthropic endpoint (Claude Code CLI, Cline, Cursor) |
| `POST` | `/v1/responses` | OpenAI Responses API |
| `POST` | `/v1/search` | Unified web search (SearXNG → DuckDuckGo → Tavily) |
| `POST` | `/v1/web/fetch` | URL content extraction via Jina Reader |
| `GET` | `/api/mcp/sse` | MCP Server via SSE |
| `POST` | `/api/mcp/messages` | MCP Server via RPC |
| `GET` | `/api/oauth/antigravity/start` | Start Google/Code Assist OAuth flow |

---

## 🚀 Quick Deploy

### Prerequisites

- [Cloudflare](https://dash.cloudflare.com) account (free plan works)
- [Node.js](https://nodejs.org) >= 18
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

### 1. Clone the repository

```bash
git clone https://github.com/samucamg/veroroute-edge.git
cd veroroute-edge
npm install
```

### 2. Create KV Namespaces on Cloudflare

```bash
npx wrangler kv:namespace create OMNI_CACHE
npx wrangler kv:namespace create OMNI_KEYS
```

Copy the generated IDs and fill them in `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  { "binding": "OMNI_CACHE", "id": "YOUR_ID_HERE" },
  { "binding": "OMNI_KEYS",  "id": "YOUR_ID_HERE" }
]
```

### 3. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .dev.vars.example .dev.vars
```

```ini
AUTH_TOKEN=your-secret-token
GEMINI_API_KEYS=AIza...,AIza...
GROQ_API_KEYS=gsk_...
CEREBRAS_API_KEYS=csk-...
SEARXNG_URL=https://your-searxng-instance.yourdomain.com
TAVILY_API_KEY=tvly-...
JINA_API_KEY=jina_...
```

For production, configure via `wrangler secret`:

```bash
npx wrangler secret put AUTH_TOKEN
npx wrangler secret put GEMINI_API_KEYS
```

### 4. Local development

```bash
npx wrangler dev
```

### 5. Deploy to production

```bash
npx wrangler deploy
```

---

## 🔍 SearXNG Configuration (Web Search)

**SearXNG** is an open-source meta-search engine that aggregates results from dozens of engines without tracking. VeroRoute Edge uses SearXNG as the **primary search provider** with automatic fallback to DuckDuckGo HTML and Tavily.

### Option A: Docker Compose (Recommended)

```bash
mkdir ~/searxng && cd ~/searxng
```

```yaml
# docker-compose.yml
version: "3.8"
services:
  searxng:
    image: searxng/searxng:latest
    container_name: searxng
    restart: unless-stopped
    ports:
      - "8888:8080"
    volumes:
      - ./searxng-data:/etc/searxng
    environment:
      - SEARXNG_BASE_URL=https://search.yourdomain.com/
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETGID
      - SETUID
```

Edit `./searxng-data/settings.yml` and enable:

```yaml
search:
  formats:
    - html
    - json  # ← Essential for VeroRoute Edge
```

```bash
docker compose up -d
# Test:
curl "http://localhost:8888/search?q=test&format=json" | jq '.results[:2]'
```

### Option B: Cloudflare Tunnel (Zero Trust)

```bash
cloudflared tunnel login
cloudflared tunnel create searxng-veroroute
cloudflared tunnel route dns searxng-veroroute search.yourdomain.com
cloudflared tunnel --url http://localhost:8888 run searxng-veroroute
```

Set in `.dev.vars`:
```ini
SEARXNG_URL=https://search.yourdomain.com
```

### Option C: Public instances (testing only)

```ini
SEARXNG_URL=https://searx.be
```

---

## 🎯 Routing Combos

| Combo | Description | Providers |
| :--- | :--- | :--- |
| `omni-free` | Maximum savings, zero cost | Gemini 2.5 Flash → Groq → Cerebras → CF Workers AI → OpenRouter → Pollinations |
| `omni-code` | Optimized for coding | Antigravity Gemini 2.5 Pro → Qwen 2.5 Coder → Groq → Cerebras |
| `omni-fast` | Maximum speed (>500 t/s) | Cerebras (P2C) + Groq (P2C) |

```bash
curl -X POST https://your-worker.workers.dev/v1/chat/completions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model": "omni-free", "messages": [{"role": "user", "content": "Hello!"}]}'
```

---

## ⚙️ Routing Strategies

| Strategy | Description |
| :--- | :--- |
| `priority` | (Default) Executes in defined order with cascade fallback |
| `round-robin` | Distributes requests equally among providers |
| `p2c` | Power of Two Choices — selects the least loaded of 2 random candidates |
| `least-used` | Chooses the provider with least accumulated usage in the session |
| `cost` | Prioritizes providers with lower cost per token |
| `fastest` | Chooses the provider with lowest historical latency |
| `weighted` | Weighted load balancing by configured weight |
| `session-affinity` | Pins the session to a specific provider |

---

## 📋 Changelog — Audit Fixes (v1.1.0)

### 🔴 Fix 1: Gemini REST API URL corrected
- **File**: `src/adapters/openai-compatible.ts`
- **Problem**: Non-streaming URL used `&key=` instead of `?key=`, causing HTTP 400/404.
- **Fix**: Streaming and non-streaming URLs are now built separately with correct delimiters.

### 🔴 Fix 2: Deduplication shielded for tool messages
- **File**: `src/compression/pipeline.ts`
- **Problem**: `role: "tool"` messages were removed by hash, causing HTTP 400 (`tool_call_id mismatch`).
- **Fix**: Messages with `role === "tool"` or containing `tool_calls` are automatically preserved.

### 🟡 Fix 3: Robust Anthropic SSE Streaming with tool_calls support
- **File**: `src/adapters/anthropic.ts`
- **Problem**: (a) No line buffer — TCP-cut chunks caused parse failure. (b) `delta.tool_calls` was ignored.
- **Fix**: Line accumulator buffer and full support for Anthropic tool events.

### 🟡 Fix 4: DuckDuckGo now performs real web search
- **File**: `src/search/duckduckgo.ts`
- **Problem**: Used the Instant Answers API which only returns dictionary/Wikipedia responses.
- **Fix**: Migrated to scraping `html.duckduckgo.com/html/` with real result extraction.

### 🟢 Fix 5: 429 key cooldown persisted in Cloudflare KV
- **File**: `src/routing/keyPool.ts` + `src/routing/cascade.ts`
- **Problem**: Cooldowns only lived in the local isolate's memory.
- **Fix**: Dual cache (local memory + KV `OMNI_CACHE`) with automatic TTL and global synchronization.

---

## 📄 License

MIT — Use, modify and distribute freely.