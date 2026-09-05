# ⚡ VeroRoute Edge — Serverless AI Gateway & Smart Router

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
- 🗜️ **Pipeline de Compressão de Contexto**: Reduz o uso de tokens com deduplicação inteligente de mensagens entre turnos (`session-dedup`), limpeza de logs de terminal (`rtk`) e compactação de espaços (`lite`). Mensagens de ferramentas (`role: "tool"`) são blindadas contra deduplicação para evitar erros de `tool_call_id mismatch`.
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
│  │                                                                │  │
│  │  [Auth Middleware] → [Compression Pipeline] → [Modality Bridge]│  │
│  │         │                                                      │  │
│  │         ▼                                                      │  │
│  │  ┌─────────────────────────────────────────────┐               │  │
│  │  │       🔄 Cascata de Resiliência             │               │  │
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
│  │  KV: [OMNI_CACHE (cooldowns)] [OMNI_KEYS (chaves extras)]     │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
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
git clone https://github.com/seu-usuario/veroroute-edge.git
cd veroroute-edge
npm install
```

### 2. Crie os KV Namespaces na Cloudflare

```bash
# Cache de cooldowns e tokens
npx wrangler kv:namespace create OMNI_CACHE
# Pool de chaves extras
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

Crie o arquivo `.dev.vars` para desenvolvimento local:

```ini
# Token de autenticação do gateway (obrigatório em produção)
AUTH_TOKEN=seu-token-secreto

# Chaves de API (separadas por vírgula para pool com round-robin)
GEMINI_API_KEYS=AIza...,AIza...
GROQ_API_KEYS=gsk_...
CEREBRAS_API_KEYS=csk-...

# Antigravity OAuth (opcional — para Google Cloud Code Assist)
ANTIGRAVITY_CLIENT_ID=seu-client-id
ANTIGRAVITY_CLIENT_SECRET=seu-client-secret

# SearXNG (opcional — ver seção abaixo para instalação)
SEARXNG_URL=https://sua-instancia-searxng.seudominio.com

# Tavily (opcional — chave gratuita em tavily.com)
TAVILY_API_KEY=tvly-...

# Jina Reader (opcional)
JINA_API_KEY=jina_...
```

Para produção, configure via `wrangler secret`:

```bash
npx wrangler secret put AUTH_TOKEN
npx wrangler secret put GEMINI_API_KEYS
npx wrangler secret put GROQ_API_KEYS
# ... etc
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

O **SearXNG** é um meta-buscador open-source que agrega resultados de dezenas de engines (Google, Bing, DuckDuckGo, Wikipedia, etc.) sem tracking. O VeroRoute Edge usa o SearXNG como **provider primário de busca** quando configurado, com fallback automático para DuckDuckGo HTML e Tavily.

### Opção A: Docker Compose (Recomendado)

#### 1. Crie a pasta e o arquivo `docker-compose.yml`

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
      - SEARXNG_BASE_URL=https://search.seudominio.com/
      - SEARXNG_SECRET_KEY=${SEARXNG_SECRET_KEY:-$(openssl rand -hex 32)}
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETGID
      - SETUID
    logging:
      driver: "json-file"
      options:
        max-size: "1m"
        max-file: "1"
```

#### 2. Configure o SearXNG para API JSON

O VeroRoute Edge faz requisições com `format=json`. Edite `./searxng-data/settings.yml`:

```yaml
# settings.yml — configuração mínima para uso com VeroRoute Edge
use_default_settings: true

server:
  secret_key: "mude-esta-chave-para-producao"
  bind_address: "0.0.0.0"
  port: 8080
  limiter: false  # Desabilita rate limiter para uso interno

search:
  safe_search: 0
  autocomplete: ""
  default_lang: "pt-BR"
  formats:
    - html
    - json  # ← Fundamental para o VeroRoute Edge

# Habilite as engines desejadas — Google e Bing dão os melhores resultados
engines:
  - name: google
    engine: google
    shortcut: g
    disabled: false

  - name: bing
    engine: bing
    shortcut: b
    disabled: false

  - name: duckduckgo
    engine: duckduckgo
    shortcut: ddg
    disabled: false

  - name: wikipedia
    engine: wikipedia
    shortcut: wp
    disabled: false

  - name: github
    engine: github
    shortcut: gh
    disabled: false

  - name: stackoverflow
    engine: stackoverflow
    shortcut: so
    disabled: false
```

#### 3. Inicie o SearXNG

```bash
docker compose up -d
```

#### 4. Teste a API

```bash
# Verificar se retorna JSON
curl "http://localhost:8888/search?q=cloudflare+workers&format=json" | jq '.results[:2]'
```

#### 5. Configure no VeroRoute Edge

Em `.dev.vars` ou via `wrangler secret`:

```ini
SEARXNG_URL=http://seu-servidor:8888
```

### Opção B: Expor via Cloudflare Tunnel (Zero Trust)

Se o SearXNG está numa VPS/servidor local e você quer acessá-lo pela edge da Cloudflare sem abrir portas:

```bash
# Instale o cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# Crie o tunnel
cloudflared tunnel login
cloudflared tunnel create searxng-veroroute

# Configure o tunnel para apontar para o SearXNG local
cloudflared tunnel route dns searxng-veroroute search.seudominio.com
cloudflared tunnel --url http://localhost:8888 run searxng-veroroute
```

Depois configure no VeroRoute Edge:

```ini
SEARXNG_URL=https://search.seudominio.com
```

### Opção C: Instâncias públicas (Não recomendado para produção)

Para testes rápidos, você pode usar instâncias públicas do SearXNG. **Atenção**: instâncias públicas possuem rate limiting agressivo e podem ser instáveis.

```ini
SEARXNG_URL=https://searx.be
# ou
SEARXNG_URL=https://search.mdosch.de
```

### Cascata de busca

O VeroRoute Edge segue esta cascata automática:

```
1. SearXNG (se SEARXNG_URL configurado) → resultados ricos, multi-engine
2. DuckDuckGo HTML (sempre disponível, sem chave) → resultados web reais via scraping
3. Tavily Search (se TAVILY_API_KEY configurado) → API comercial com snippets otimizados
```

---

## 🎯 Combos de Roteamento

| Combo | Descrição | Provedores |
| :--- | :--- | :--- |
| `omni-free` | Máxima economia, zero custo | Gemini 2.5 Flash → Groq → Cerebras → CF Workers AI → OpenRouter → Pollinations |
| `omni-code` | Otimizado para codificação | Antigravity Gemini 2.5 Pro → Qwen 2.5 Coder → Groq → Cerebras |
| `omni-fast` | Velocidade máxima (>500 t/s) | Cerebras (P2C) + Groq (P2C) |

### Como usar Combos

```bash
curl -X POST https://seu-worker.workers.dev/v1/chat/completions \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "omni-free",
    "messages": [{"role": "user", "content": "Olá!"}]
  }'
```

---

## ⚙️ Estratégias de Roteamento

Configure via variável de ambiente `DEFAULT_ROUTING_STRATEGY` ou por requisição com `routing_strategy`:

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
- **Arquivo**: `src/adapters/openai-compatible.ts`
- **Problema**: A URL para chamadas non-streaming do Google Gemini usava `&key=` em vez de `?key=`, causando HTTP 400/404 em todas as chamadas síncronas.
- **Impacto**: Modality Bridge (transcrição de imagens) e qualquer chamada non-streaming para Gemini falhavam silenciosamente.
- **Correção**: URLs de streaming e non-streaming agora são montadas separadamente com os delimitadores corretos.

### 🔴 Fix 2: Deduplicação blindada para mensagens de ferramentas
- **Arquivo**: `src/compression/pipeline.ts`
- **Problema**: Mensagens com `role: "tool"` e `assistant` com `tool_calls` eram removidas pelo hash de deduplicação quando tinham conteúdo idêntico.
- **Impacto**: OpenAI e Anthropic rejeitavam com HTTP 400 (`tool_call_id mismatch`).
- **Correção**: Mensagens com `role === "tool"` ou que contenham `tool_calls` agora são automaticamente preservadas.

### 🟡 Fix 3: Streaming SSE Anthropic robusto com suporte a tool_calls
- **Arquivo**: `src/adapters/anthropic.ts`
- **Problema**: (a) Sem buffer de linha — chunks TCP cortados no meio de um JSON causavam parse failure. (b) `delta.tool_calls` era ignorado — clientes como Claude Code CLI travavam ao receber tool use via streaming.
- **Correção**: Buffer acumulador de linha reconstruído chunk a chunk, e suporte completo a eventos `content_block_start` / `input_json_delta` / `content_block_stop` para ferramentas.

### 🟡 Fix 4: DuckDuckGo agora faz busca web real
- **Arquivo**: `src/search/duckduckgo.ts`
- **Problema**: Usava a Instant Answers API (`api.duckduckgo.com`) que só retorna respostas de dicionário/Wikipedia; consultas de busca reais retornavam vazio.
- **Correção**: Migrado para scraping de `html.duckduckgo.com/html/` com extração de título, URL real (decodificando o redirect `uddg`) e snippet.

### 🟢 Fix 5: Cooldown de chaves 429 persistido no Cloudflare KV
- **Arquivo**: `src/routing/keyPool.ts` + `src/routing/cascade.ts`
- **Problema**: Cooldowns de rate-limit (429) ficavam apenas na memória local do isolate — outros isolates em PoPs diferentes continuavam usando chaves bloqueadas.
- **Correção**: Cooldowns agora usam cache dual (memória local + KV `OMNI_CACHE`) com TTL automático, garantindo sincronização global entre todos os isolates da Cloudflare.

---

## 📄 Licença

MIT — Use, modifique e distribua livremente.
