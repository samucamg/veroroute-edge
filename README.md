<div align="center">

# ⚡ VeroRoute Edge

### Aerodynamic Serverless AI Gateway & Smart Router for Cloudflare Workers
### Gateway de IA Serverless Aerodinâmico e Roteador Inteligente para Cloudflare Workers

[![Fork on GitHub](https://img.shields.io/badge/Fork%20on%20GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/samucamg/veroroute-edge/fork)

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Hono](https://img.shields.io/badge/Hono-E36002?style=for-the-badge&logo=hono&logoColor=white)](https://hono.dev/)
[![OpenAI Compatible](https://img.shields.io/badge/OpenAI-compatible-412991?style=for-the-badge&logo=openai&logoColor=white)](#-endpoint-matrix)
[![Anthropic Compatible](https://img.shields.io/badge/Anthropic-compatible-191919?style=for-the-badge)](#-endpoint-matrix)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)
[![Documentation](https://img.shields.io/badge/Docs-veroroute.24hs.eu.org-0e7488?style=for-the-badge)](https://veroroute.24hs.eu.org/)

**[🇺🇸 English](#english) · [🇧🇷 Português](#portugues)**

> [!IMPORTANT]
> **Never install VeroRoute Edge with the one-click `Deploy to Cloudflare` button.**
> That kind of deploy creates a detached Worker that **never receives another update**.
> Because the project is in active beta, always install it through a **fork** of this repository,
> which keeps your instance updatable with a single **Sync fork → Update branch** click.
>
> **PT-BR:** **Não instale pelo botão de deploy em um clique.** Esse tipo de instalação cria um Worker desconectado que **nunca mais recebe atualizações**. Como o projeto está em beta ativo, faça sempre o **fork** e conecte o GitHub à Cloudflare.
>
> 🚀 **Guia de implantação / Deployment guide:** [veroroute.24hs.eu.org/#deploy](https://veroroute.24hs.eu.org/#deploy)

### 🎥 Vídeo tutorial de instalação

[![Como instalar e configurar o VeroRoute Edge passo a passo](https://i.ytimg.com/vi/Qv4iJX8XCD8/maxresdefault.jpg)](https://www.youtube.com/watch?v=Qv4iJX8XCD8)

**PT-BR:** [Como Instalar e Configurar o VeroRoute Edge Passo a Passo](https://www.youtube.com/watch?v=Qv4iJX8XCD8) · canal [Samuca Tutoriais](https://www.youtube.com/@SamucaTutoriais)


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

- 🛡️ **Anti-Ban Architecture (Proxy-Free)** — Since requests run directly from Cloudflare's massive shared datacenter IPs, your egress traffic blends into thousands of legitimate corporate apps. This drastically reduces the chance of IP bans from providers compared to using cheap or datacenter proxies, allowing you to seamlessly rotate multiple API keys (using Cascade) without needing a single HTTP proxy.
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

## ⚡ Deployment Guide

### 🚀 Recommended: Fork on GitHub + Cloudflare Workers (validated in beta)

This is the official, tested path. The fork stays connected to Cloudflare, the KV namespaces are prepared during the build, and future updates are applied with a single **Sync fork** click.

1. **Fork the repository (web)**:
   Open the [official repository](https://github.com/samucamg/veroroute-edge) and click **Fork**. Keep the repository name as `veroroute-edge` when possible.

2. **Connect GitHub to Cloudflare**:
   In the [Cloudflare Dashboard](https://dash.cloudflare.com/) search for **Workers**, open **Workers & Pages → Create application**, choose to connect your GitHub account (or connect another one) and select your `veroroute-edge` fork.

3. **Change only the project name**:
   On the next page, change **only the project name** — it becomes your URL `https://your-name.workers.dev`. Leave the build command, branch, directory and every other generated option untouched. Click **Next**, then **Deploy**.

4. **Wait for the build**:
   Deployment takes only a few minutes. Wait until it finishes without errors.

5. **Enable the production address (Domains)**:
   Open **Domains** and use the toggle on the right to enable the production link, then click **Visit**. *Optional:* click **Add domain**, pick a domain from your Cloudflare account, add a subdomain (or leave it empty to use the domain itself), and confirm with **Add domain**.

6. **Configure your master password (`AUTH_TOKEN`)**:
   - **Fresh installation (first-time setup)**: `wrangler.toml` does **not** ship a predictable default password; if no `AUTH_TOKEN` is configured, all protected routes (`/api/admin/*`, `/v1/*`) fail closed with `401 Unauthorized`. Set your initial `AUTH_TOKEN` before logging in via one of:
     1. **Cloudflare Dashboard**: Open your Worker → **Settings → Variables and Secrets**, add `AUTH_TOKEN` (Secret or Variable) with a strong random value (e.g., `openssl rand -hex 32`), and click **Deploy**.
     2. **Wrangler CLI**: Run `npx wrangler secret put AUTH_TOKEN` and paste your token.
     3. **Local development**: Copy `.dev.vars.example` to `.dev.vars` and set `AUTH_TOKEN=your_local_secret`.
   - ⚡ **Zero KV setup**: Cloudflare provisions and links `OMNI_KEYS` and `OMNI_CACHE` automatically during the build.

> 🔐 **Existing installation — Zero-Lockout `AUTH_TOKEN` Rotation & Precedence**:
> VeroRoute Edge resolves the master token in strict order: **(1) `admin:config.authToken` stored in Cloudflare KV (`OMNI_KEYS`)** takes absolute precedence over **(2) Worker `env.AUTH_TOKEN` (`Variables and Secrets` / `.dev.vars`)**.
> 1. **Check which token source is currently active**:
>    ```bash
>    curl -sS -H "Authorization: Bearer <CURRENT_TOKEN>" https://<YOUR_WORKER>/api/admin/settings/auth-token
>    ```
>    - `"hasCustomToken": true` → KV `admin:config.authToken` is active (survives **Sync fork** and rebuilds automatically).
>    - `"hasCustomToken": false` → Worker `env.AUTH_TOKEN` is active.
> 2. **Safe rotation sequence (without losing admin access)**:
>    - Update the KV-persisted token via the Admin Panel (**Settings → Master Token**) or API:
>      ```bash
>      curl -sS -X PUT https://<YOUR_WORKER>/api/admin/settings/auth-token \
>        -H "Authorization: Bearer <CURRENT_TOKEN>" \
>        -H "Content-Type: application/json" \
>        -d '{"token":"<NEW_STRONG_TOKEN>"}'
>      ```
>    - Verify the new token returns `200 OK` and the old token returns `401 Unauthorized` against `/api/admin/settings/auth-token`.
>    - Optionally mirror the same token into Worker Secrets (`npx wrangler secret put AUTH_TOKEN` or Dashboard **Settings → Variables and Secrets**) as a backup fallback.

> 💡 **Staying updated**: open your fork and click **Sync fork ➔ Update branch**. Cloudflare redeploys automatically in about a minute and your KV-stored `authToken`, provider keys, combos, and settings remain intact in `OMNI_KEYS`.

---

### 💻 Alternative: Manual CLI Deployment

For developers who prefer using the command line:

```bash
# 1. Clone repository
git clone https://github.com/samucamg/veroroute-edge.git
cd veroroute-edge

# 2. Install dependencies
npm install

# 3. Create KV Namespaces
npx wrangler kv namespace create OMNI_CACHE
npx wrangler kv namespace create OMNI_KEYS

# 4. Bind in wrangler.toml or Dashboard
# Uncomment the kv_namespaces block in wrangler.toml with your generated IDs.

# 5. Deploy to Cloudflare Workers
npx wrangler deploy

# 6. Set mandatory master AUTH_TOKEN secret
npx wrangler secret put AUTH_TOKEN
```

---

## 📚 Official Documentation

- 🌐 **Documentation website**: [https://veroroute.24hs.eu.org/](https://veroroute.24hs.eu.org/) — guides, architecture, providers and the full endpoint reference.
- 📖 **Functions & features reference**: [FUNCOES-VEROROUTE-EDGE.md](FUNCOES-VEROROUTE-EDGE.md)
- 🔌 **API endpoint matrix (section 12)**: [FUNCOES-VEROROUTE-EDGE.md#12-matriz-de-endpoints-da-api](FUNCOES-VEROROUTE-EDGE.md#12-matriz-de-endpoints-da-api)
- 🚀 **Deployment guide**: [https://veroroute.24hs.eu.org/#deploy](https://veroroute.24hs.eu.org/#deploy)

---

## 🛠️ Configuration & Environment Variables

| Environment Variable | Description | Default | Mandatory |
|---|---|---|---|
| `AUTH_TOKEN` | Master bearer token for the Admin API and dashboard (fail-closed `401` if unset in both KV `admin:config.authToken` and Worker Secrets/Vars). Set via Dashboard **Settings → Variables and Secrets**, `npx wrangler secret put AUTH_TOKEN`, or `.dev.vars` | — (Required) | Yes |
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

Full and always up-to-date matrix: **[FUNCOES-VEROROUTE-EDGE.md — Section 12](FUNCOES-VEROROUTE-EDGE.md#12-matriz-de-endpoints-da-api)**. Interactive reference: [veroroute.24hs.eu.org/#api](https://veroroute.24hs.eu.org/#api).

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/health` | GET | None | Gateway health and status check |
| `/v1/models` | GET | Bearer | OpenAI-compatible model, provider and combo listing |
| `/v1/chat/completions` | POST | Bearer | OpenAI-compatible chat completion (streaming & non-streaming) |
| `/v1/messages` | POST | Bearer | Anthropic-compatible messages API |
| `/v1/responses` | POST | Bearer | OpenAI Response format adapter |
| `/v1/search` | POST | Bearer | Web search / RAG |
| `/v1/web/fetch` | POST | Bearer | Web content extraction |
| `/v1/images/generations`, `/v1/images/edits` | POST | Bearer | Image generation and editing |
| `/v1/audio/speech`, `/v1/audio/transcriptions`, `/v1/audio/translations` | POST | Bearer | Speech synthesis, transcription and translation |
| `/api/admin/config` | GET/POST | Master Bearer | Admin configuration management |
| `/api/admin/providers/:id/*` | POST/DELETE | Master Bearer | Provider toggle, endpoint, keys and models |
| `/api/admin/providers/:id/fetch-models` | POST | Master Bearer | Dynamic upstream model discovery |
| `/api/admin/providers/:id/test-models` | POST | Master Bearer | Direct per-model connectivity test |
| `/api/admin/models` | GET/POST | Master Bearer | Global model catalog and per-model state |
| `/api/admin/virtual-keys` | GET/POST/DELETE | Master Bearer | Virtual API key management |
| `/api/admin/combos` | GET/POST/DELETE | Master Bearer | Custom combo routes and combo testing |
| `/api/admin/presets` | GET | Master Bearer | Free provider presets |
| `/api/admin/search` | GET/POST | Master Bearer | Web search provider configuration and testing |
| `/api/admin/usage/:keyId` | GET | Master Bearer | Daily/monthly usage and estimated cost |
| `/api/admin/circuits` | GET | Master Bearer | Circuit breaker states |
| `/api/oauth/antigravity/*` | GET/POST | Master Bearer* | Google Code Assist OAuth and token import (*`/callback` is a Google redirect) |
| `/api/mcp/*` | GET/POST | Bearer | MCP server when `ENABLE_MCP_SERVER=true` |

---

## 📄 License & Upstream Attribution

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

- **Author & Maintainer**: Samuel Santos ([@samucamg](https://github.com/samucamg))
- **Official Upstream Repository**: [https://github.com/samucamg/veroroute-edge](https://github.com/samucamg/veroroute-edge)
- **Lineage & Inspiration**: Directly inspired by [OmniRoute](https://github.com/diegosouzapw/OmniRoute) by [@diegosouzapw](https://github.com/diegosouzapw) and the token-saving principles of VeroRoute.

> ⚠️ **Mandatory Attribution Notice**: In accordance with the MIT License terms, any public clone, fork, or derived distribution of this project **must retain the copyright notice, original author attribution, and link to the official upstream repository**.

---

<a id="portugues"></a>
# 🇧🇷 Português

## ✨ Visão Geral & Agradecimentos

O **VeroRoute Edge** é um gateway de IA serverless e roteador inteligente projetado especificamente para o **Cloudflare Workers (V8 Isolates)**. Documentação completa: [veroroute.24hs.eu.org](https://veroroute.24hs.eu.org/).

> 💡 **Inspiração e Origem**  
> Este projeto foi diretamente inspirado no excelente projeto [**OmniRoute**](https://github.com/diegosouzapw/OmniRoute) criado por [@diegosouzapw](https://github.com/diegosouzapw).
> 
> **Qual projeto você deve escolher?**
> - **Escolha o [OmniRoute](https://github.com/diegosouzapw/OmniRoute)** se você possui acesso a uma VPS ou servidor dedicado, precisa de suporte multi-tenant complexo, banco de dados relacional completo ou quer todas as funcionalidades avançadas de um gateway auto-hospedado robusto.
> - **Escolha o VeroRoute Edge** se você não possui uma VPS, deseja **zero manutenção de servidor**, roteamento global de altíssima velocidade na infraestrutura serverless do **Cloudflare Workers**, ou precisa de uma solução leve e sem custos fixos de hospedagem.

### 🚀 Principais Funcionalidades

- 🛡️ **Arquitetura Anti-Ban (Sem Proxies)** — O tráfego de saída utiliza os IPs compartilhados globais da Cloudflare, misturando suas requisições com milhares de aplicativos corporativos legítimos. Isso reduz drasticamente o risco de banimentos por IP (que ocorrem frequentemente ao usar proxies baratos ou de datacenters), permitindo a rotação de múltiplas chaves em Cascata sem a necessidade de gerenciar uma frota de proxies HTTP.
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

## ⚡ Guia de Implantação

### 🚀 Método Recomendado: Fork no GitHub + Cloudflare Workers (validado na fase beta)

Este é o caminho oficial e testado. O fork permanece conectado à Cloudflare, os bancos KV são preparados durante o build e as próximas atualizações são aplicadas com um único clique em **Sync fork**.

1. **Faça o Fork do repositório (pela web)**:
   Abra o [repositório oficial](https://github.com/samucamg/veroroute-edge) e clique em **Fork**. Mantenha o nome do repositório como `veroroute-edge`, se possível.

2. **Conecte o GitHub à sua conta Cloudflare**:
   No [Painel da Cloudflare](https://dash.cloudflare.com/), digite **Workers** na busca, abra **Workers & Pages → Create application**, escolha conectar sua conta do GitHub (ou conecte outra) e selecione o fork `veroroute-edge`.

3. **Altere somente o nome do projeto**:
   Na tela seguinte, altere **apenas o nome do projeto** — ele será usado na URL `https://nome-do-projeto.workers.dev`. Não altere o comando de build, a branch, o diretório nem qualquer outra opção já preenchida pelo repositório. Clique em **Next** e depois em **Deploy**.

4. **Aguarde a conclusão do deploy**:
   A publicação leva poucos minutos. Aguarde terminar sem erros antes de abrir o Worker.

5. **Habilite o endereço de produção (Domains)**:
   Abra **Domains** e clique no botão à direita para habilitar o link em produção; use **Visit** para acessar. *Opcional:* clique em **Add domain**, escolha um domínio da sua conta Cloudflare, informe um subdomínio (ou deixe vazio para usar o próprio domínio) e confirme em **Add domain**.

6. **Configure sua senha mestre (`AUTH_TOKEN`)**:
   - **Instalação nova (primeiro acesso)**: o `wrangler.toml` **não** inclui senha padrão previsível; enquanto nenhum `AUTH_TOKEN` estiver configurado, todas as rotas protegidas (`/api/admin/*`, `/v1/*`) operam em modo *fail-closed* (`401 Unauthorized`). Defina seu primeiro `AUTH_TOKEN` por um dos caminhos:
     1. **Painel da Cloudflare**: Abra seu Worker → **Settings → Variables and Secrets**, adicione `AUTH_TOKEN` (Secret ou Variable) com um valor forte (ex.: `openssl rand -hex 32`) e clique em **Deploy**.
     2. **Wrangler CLI**: Execute `npx wrangler secret put AUTH_TOKEN` e informe o token.
     3. **Desenvolvimento local**: Copie `.dev.vars.example` para `.dev.vars` e preencha `AUTH_TOKEN=sua_senha_local`.
   - ⚡ **Zero configuração de KV**: a Cloudflare cria e vincula `OMNI_KEYS` e `OMNI_CACHE` automaticamente durante o build.

> 🔐 **Instalação existente — Precedência e Rotação Segura do `AUTH_TOKEN` (Sem Perda de Acesso)**:
> O VeroRoute Edge resolve o token mestre na seguinte ordem: **(1) `admin:config.authToken` persistido no Cloudflare KV (`OMNI_KEYS`)** tem precedência absoluta sobre **(2) `env.AUTH_TOKEN` do Worker (`Variables and Secrets` / `.dev.vars`)**.
> 1. **Verifique qual fonte está ativa no ambiente**:
>    ```bash
>    curl -sS -H "Authorization: Bearer <TOKEN_ATUAL>" https://<SEU_WORKER>/api/admin/settings/auth-token
>    ```
>    - `"hasCustomToken": true` → o `authToken` do KV está ativo (sobrevive automaticamente a **Sync fork** e novos deploys).
>    - `"hasCustomToken": false` → o `env.AUTH_TOKEN` do Worker está ativo.
> 2. **Sequência segura de rotação (zero lockout)**:
>    - Grave o novo token no KV pelo Painel Administrativo (**Configurações → Token de Acesso**) ou via API:
>      ```bash
>      curl -sS -X PUT https://<SEU_WORKER>/api/admin/settings/auth-token \
>        -H "Authorization: Bearer <TOKEN_ATUAL>" \
>        -H "Content-Type: application/json" \
>        -d '{"token":"<NOVO_TOKEN_FORTE>"}'
>      ```
>    - Confirme que o novo token responde `200 OK` e que o token antigo responde `401 Unauthorized` em `/api/admin/settings/auth-token`.
>    - Opcionalmente, atualize também o Secret do Worker (`npx wrangler secret put AUTH_TOKEN` ou **Settings → Variables and Secrets**) como fallback de segurança.

> 💡 **Como manter atualizado**: abra o seu fork e clique em **Sync fork ➔ Update branch**. A Cloudflare refaz o deploy automaticamente em cerca de um minuto e seu `authToken`, chaves de provedores, combos e configurações permanecem intactos no KV `OMNI_KEYS`.

---

### 💻 Alternativa: Implantação Manual via CLI

Para desenvolvedores que preferem a linha de comando:

```bash
# 1. Clonar repositório
git clone https://github.com/samucamg/veroroute-edge.git
cd veroroute-edge

# 2. Instalar dependências
npm install

# 3. Criar Namespaces do KV
npx wrangler kv namespace create OMNI_CACHE
npx wrangler kv namespace create OMNI_KEYS

# 4. Descomentar kv_namespaces no wrangler.toml com os IDs gerados

# 5. Realizar o deploy no Cloudflare Workers
npx wrangler deploy

# 6. Definir a chave mestre AUTH_TOKEN
npx wrangler secret put AUTH_TOKEN
```

---

## 📚 Documentação Oficial

- 🌐 **Site de documentação**: [https://veroroute.24hs.eu.org/](https://veroroute.24hs.eu.org/) — guias, arquitetura, provedores e referência completa dos endpoints.
- 📖 **Funções e recursos**: [FUNCOES-VEROROUTE-EDGE.md](FUNCOES-VEROROUTE-EDGE.md)
- 🔌 **Matriz de Endpoints da API (seção 12)**: [FUNCOES-VEROROUTE-EDGE.md#12-matriz-de-endpoints-da-api](FUNCOES-VEROROUTE-EDGE.md#12-matriz-de-endpoints-da-api)
- 🚀 **Guia de implantação**: [https://veroroute.24hs.eu.org/#deploy](https://veroroute.24hs.eu.org/#deploy)

---

## 🔐 Configuração do Google OAuth (Antigravity CLI / Code Assist)

O VeroRoute Edge integra-se com os modelos Gemini 2.5 Pro e Claude 3.7 Sonnet através dos endpoints oficiais do Google Cloud Code Assist.

Existem **duas formas** de autenticar:

### Método 1: Importação Direta de Tokens (Recomendado — Sem Google Cloud Console)
Se você já utiliza o Antigravity CLI ou Gemini Code Assist no seu terminal ou IDE, você não precisa criar credenciais no Google Cloud:
1. Abra o painel administrativo (`/` com seu `AUTH_TOKEN`) e acesse a aba **Antigravity OAuth**.
2. No campo **Importação Manual de Tokens**, cole o conteúdo do seu arquivo local `~/.config/antigravity/tokens.json` (ou seu `refresh_token`).
3. Clique em **Salvar Tokens no Worker**. O VeroRoute Edge armazenará o token com segurança no Cloudflare KV (`OMNI_KEYS`) e cuidará da renovação automática de acesso.

### Método 2: Fluxo Web com Botão "Autorizar com Google"
Por requisitos de segurança do Google Identity, cada aplicativo web deve registrar expressamente suas URLs de redirecionamento autorizadas. Como cada implantação do Cloudflare Workers possui um subdomínio próprio (`https://<seu-worker>.workers.dev`), é necessário criar um Client ID gratuito no console Google Cloud:
1. No painel administrativo do VeroRoute Edge (aba Antigravity OAuth), clique em **📋 Copiar URI** para copiar a URL de redirecionamento do seu worker (ex: `https://<seu-worker>.workers.dev/api/oauth/antigravity/callback`).
2. Acesse o [Google Cloud Console → Credenciais](https://console.cloud.google.com/apis/credentials).
3. Clique em **+ Criar Credenciais** → **ID do cliente OAuth** → Tipo: **Aplicativo da Web**.
4. Em **URIs de redirecionamento autorizados**, cole a URL copiada no passo 1 e salve.
5. Copie o **Client ID** e **Client Secret** gerados e cole nos campos correspondentes na aba Antigravity OAuth do painel.
6. Clique em **Salvar Credenciais no KV** e, em seguida, clique no botão **🔗 Autorizar com Google** para concluir o login.

---

## 📄 Licença & Atribuição ao Upstream Oficial

Este projeto é distribuído sob a licença **MIT**. Veja [LICENSE](LICENSE) para mais detalhes.

- **Autor e Mantenedor**: Samuel Santos ([@samucamg](https://github.com/samucamg))
- **Repositório Upstream Oficial**: [https://github.com/samucamg/veroroute-edge](https://github.com/samucamg/veroroute-edge)
- **Origem & Lineage**: Inspirado diretamente no [OmniRoute](https://github.com/diegosouzapw/OmniRoute) criado por [@diegosouzapw](https://github.com/diegosouzapw) e nos conceitos do VeroRoute.

> ⚠️ **Aviso de Atribuição Obrigatória**: Conforme os termos da licença MIT, qualquer clonagem, fork ou redistribuição pública deste código **deve obrigatoriamente manter o aviso de direitos autorais, o nome do autor original e o link de referência para o repositório upstream oficial**.

