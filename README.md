<div align="center">

# ⚡ VeroRoute Edge

### Aerodynamic Serverless AI Gateway & Smart Router for Cloudflare Workers
### Gateway de IA Serverless Aerodinâmico e Roteador Inteligente para Cloudflare Workers

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/samucamg/veroroute-edge)

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Hono](https://img.shields.io/badge/Hono-E36002?style=for-the-badge&logo=hono&logoColor=white)](https://hono.dev/)
[![OpenAI Compatible](https://img.shields.io/badge/OpenAI-compatible-412991?style=for-the-badge&logo=openai&logoColor=white)](#-endpoint-matrix)
[![Anthropic Compatible](https://img.shields.io/badge/Anthropic-compatible-191919?style=for-the-badge)](#-endpoint-matrix)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)

**[🇺🇸 English](#english) · [🇧🇷 Português](#portugues)**

</div>

---

<a id="english"></a>
# 🇺🇸 English

## ✨ Overview & Acknowledgments

**VeroRoute Edge** is an edge-native AI gateway and smart router designed specifically for **Cloudflare Workers (V8 Isolates)**.

> 💡 **Inspiration & Lineage**  
> This project is directly inspired by the outstanding [**OmniRoute**](https://github.com/diegosouzapw/OmniRoute) project by [@diegosouzapw](https://github.com/diegosouzapw).
> 
> **Which one should you choose?**
> - **Choose [OmniRoute](https://github.com/diegosouzapw/OmniRoute)** if you have access to a VPS / server, want full multi-tenant capabilities, complex database storage, or need all heavy features of a complete self-hosted gateway.
> - **Choose VeroRoute Edge** if you don't have a VPS, want **zero server maintenance**, ultra-fast global edge routing with **Cloudflare Workers**, or need a lightweight, high-performance gateway without dedicated server costs.

### 🚀 Key Capabilities

- 🔄 **Resilient Cascade Router** — Automatic fallback on HTTP 429/5xx errors, exponential retry backoff, per-candidate timeouts, and KV-persisted cooldowns.
- 🛠️ **Universal Tool Calling Emulation** — Prompt-injection tool calling and SSE stream conversion for providers lacking native tool support (Cloudflare Workers AI, Pollinations, 1min AI).
- ⚡ **Edge Response Caching** — Automatic caching using Cloudflare Cache API for deterministic requests (`temperature <= 0.1`) with custom TTLs.
- 🛡️ **Provider Circuit Breakers** — Automatic isolation of failing upstream providers after 5 consecutive failures, with 5-minute cooldown recovery.
- 💰 **Cost & Token Budget Control** — Real-time tracking of prompt/completion tokens and estimated USD costs per virtual key, with daily and monthly budget caps (HTTP 402).
- ⏱️ **Sliding-Window Rate Limiting** — Precise per-key RPM enforcement using Cloudflare KV.
- 🌐 **Dual API Compatibility** — Native support for both OpenAI (`/v1/chat/completions`) and Anthropic (`/v1/messages`) specifications.
- 🔒 **Hardened Edge Security** — Mandatory `AUTH_TOKEN` authentication, constant-time SHA-256 token verification, sanitized error reporting (zero secret leaks), and strict Admin CORS isolation.
- 🎛️ **Built-in Admin Panel** — Built-in single-page web GUI for managing virtual keys, combo routes, custom providers, usage metrics, and circuit status.

---

## ⚡ 1-Click Deploy — one-token setup

Deploy directly to your Cloudflare Workers account with one click:

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/samucamg/veroroute-edge)

The first-run form intentionally asks for **one secret only**: `AUTH_TOKEN`.
Do not enter dummy values such as `12345` for OpenAI, Gemini, Groq or other
providers: provider credentials are configured after deployment in the built-in
**Administration** panel.

During the Cloudflare resource step, create or select `OMNI_CACHE` and
`OMNI_KEYS`. They are Cloudflare KV storage bindings, not API credentials. After
deployment, open the Worker URL, enter Administration using `AUTH_TOKEN`, and
add only the providers you use. Workers AI and keyless providers work without
an external provider key.

Environment variables such as `OPENAI_API_KEYS` remain supported only as an
optional advanced/legacy alternative.

### Manual CLI Deployment

```bash
# 1. Clone repository
git clone https://github.com/samucamg/veroroute-edge.git
cd veroroute-edge

# 2. Install dependencies
npm install

# 3. Create KV Namespaces
npx wrangler kv namespace create OMNI_CACHE
npx wrangler kv namespace create OMNI_KEYS

# 4. Update wrangler.jsonc with your KV namespace IDs

# 5. Set mandatory master AUTH_TOKEN secret
npx wrangler secret put AUTH_TOKEN

# 6. Deploy to Cloudflare Workers
npx wrangler deploy
```

---

## 🛠️ Configuration & Environment Variables

| Environment Variable | Description | Default | Mandatory |
|---|---|---|---|
| `AUTH_TOKEN` | Master bearer token for Admin API & gateway access | — | **Yes** |
| `DEFAULT_ROUTING_STRATEGY` | Default strategy (`priority`, `weighted`, `round-robin`, `p2c`, `fill-first`, `least-used`, `cost`, `lkgp`, `session-affinity`) | `priority` | No |
| `MAX_RETRIES` | Maximum retry attempts per upstream target | `3` | No |
| `RETRY_DELAY_MS` | Initial delay between retries in milliseconds | `1000` | No |
| `CASCADE_TIMEOUT_MS` | Per-candidate timeout in milliseconds | `45000` | No |
| `CACHE_TTL_SECONDS` | Edge response cache TTL in seconds | `3600` | No |
| `QUOTA_MAX_REQUESTS` | Global sliding-window request limit | `1000` | No |
| `QUOTA_WINDOW_SECONDS` | Sliding-window duration in seconds | `60` | No |
| `OPENAI_API_KEYS` | Optional legacy/CLI alternative; prefer Administration panel | — | No |
| `GEMINI_API_KEYS` | Optional legacy/CLI alternative; prefer Administration panel | — | No |
| `GROQ_API_KEYS` | Optional legacy/CLI alternative; prefer Administration panel | — | No |
| `DEEPSEEK_API_KEYS` | Optional legacy/CLI alternative; prefer Administration panel | — | No |

---

## 📌 API Endpoint Matrix

| Endpoint | Method | Auth Required | Description |
|---|---|---|---|
| `/health` | GET | No | Gateway health and status check |
| `/v1/models` | GET | Bearer | OpenAI-compatible model listing |
| `/v1/chat/completions` | POST | Bearer | OpenAI-compatible chat completion (streaming & non-streaming) |
| `/v1/messages` | POST | Bearer | Anthropic-compatible messages API |
| `/v1/responses` | POST | Bearer | OpenAI Response format adapter |
| `/api/admin/config` | GET/POST | Master Bearer | Admin configuration management |
| `/api/admin/keys` | GET/POST/DELETE | Master Bearer | Virtual API key management |
| `/api/admin/combos` | GET/POST/DELETE | Master Bearer | Custom combo route definitions |
| `/api/admin/circuits` | GET | Master Bearer | Upstream provider circuit breaker states |
| `/api/admin/usage/:keyId` | GET | Master Bearer | Daily and monthly usage & estimated cost metrics |

---

<a id="portugues"></a>
# 🇧🇷 Português

## ✨ Visão Geral & Agradecimentos

O **VeroRoute Edge** é um gateway de IA serverless e roteador inteligente projetado especificamente para o **Cloudflare Workers (V8 Isolates)**.

> 💡 **Inspiração e Origem**  
> Este projeto foi diretamente inspirado no excelente projeto [**OmniRoute**](https://github.com/diegosouzapw/OmniRoute) criado por [@diegosouzapw](https://github.com/diegosouzapw).
> 
> **Qual projeto você deve escolher?**
> - **Escolha o [OmniRoute](https://github.com/diegosouzapw/OmniRoute)** se você possui acesso a uma VPS ou servidor dedicado, precisa de suporte multi-tenant complexo, banco de dados relacional completo ou quer todas as funcionalidades avançadas de um gateway auto-hospedado robusto.
> - **Escolha o VeroRoute Edge** se você não possui uma VPS, deseja **zero manutenção de servidor**, roteamento global de altíssima velocidade na infraestrutura serverless do **Cloudflare Workers**, ou precisa de uma solução leve e sem custos fixos de hospedagem.

### 🚀 Principais Funcionalidades

- 🔄 **Roteador Cascade Resiliente** — Fallback automático em erros 429/5xx, backoff exponencial, timeout por candidato e cooldown persistido em Cloudflare KV.
- 🛠️ **Emulação Universal de Tool Calling** — Injeção de prompts para chamada de ferramentas e conversão para SSE em provedores sem suporte nativo (Workers AI, Pollinations, 1min AI).
- ⚡ **Cache de Respostas no Edge** — Cache automático via Cloudflare Cache API para requisições determinísticas (`temperature <= 0.1`) com TTL configurável.
- 🛡️ **Circuit Breaker de Provedores** — Isolamento automático de provedores instáveis após 5 falhas consecutivas, com recuperação automática após 5 minutos.
- 💰 **Controle de Custo e Orçamento** — Rastreamento de tokens de entrada/saída e estimativa de custo em USD por chave virtual, com limite diário e mensal (HTTP 402).
- ⏱️ **Rate Limit em Janela Deslizante** — Controle preciso de requisições por minuto (RPM) por chave via Cloudflare KV.
- 🌐 **Compatibilidade Dupla** — Suporte nativo às especificações da OpenAI (`/v1/chat/completions`) e Anthropic (`/v1/messages`).
- 🔒 **Segurança Reforçada no Edge** — Autenticação `AUTH_TOKEN` obrigatória, verificação constante de token via SHA-256, sanitização de erros (zero vazamento de credenciais) e isolamento estrito de CORS no Admin.
- 🎛️ **Painel Administrativo Integrado** — Interface web single-page para gestão de chaves virtuais, combos de roteamento, provedores customizados, uso e circuit breakers.

---

## ⚡ Implantação em 1 Clique

Implante diretamente na sua conta do Cloudflare Workers com apenas um clique:

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/samucamg/veroroute-edge)

### Implantação Manual via CLI

```bash
# 1. Clonar repositório
git clone https://github.com/samucamg/veroroute-edge.git
cd veroroute-edge

# 2. Instalar dependências
npm install

# 3. Criar Namespaces do KV
npx wrangler kv namespace create OMNI_CACHE
npx wrangler kv namespace create OMNI_KEYS

# 4. Atualizar o arquivo wrangler.jsonc com os IDs gerados do KV

# 5. Definir a chave mestre AUTH_TOKEN
npx wrangler secret put AUTH_TOKEN

# 6. Realizar o deploy no Cloudflare Workers
npx wrangler deploy
```

---

## 📄 Licença

Este projeto é distribuído sob a licença **MIT**. Veja [LICENSE](LICENSE) para mais detalhes.
