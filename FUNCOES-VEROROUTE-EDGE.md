# ⚡ VeroRoute Edge — Documentação Técnica & Lista de Funcionalidades

**Versão**: 1.0.0  
**Arquitetura**: Cloudflare Workers (V8 Isolates, Serverless Edge Gateway)  
**Repositório**: [samucamg/veroroute-edge](https://github.com/samucamg/veroroute-edge)  
**Licença**: MIT  

---

## 📋 Sumário
1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Matriz de Provedores Suportados](#2-matriz-de-provedores-suportados)
3. [Módulo de Roteamento & Roteador Cascade](#3-módulo-de-roteamento--roteador-cascade)
4. [Emulação Universal de Tool Calling (Chamadas de Função)](#4-emulação-universal-de-tool-calling)
5. [Segurança, Autenticação & Gestão de Acesso](#5-segurança-autenticação--gestão-de-acesso)
6. [Resiliência, Timeouts & Circuit Breakers](#6-resiliência-timeouts--circuit-breakers)
7. [Controle de Custos, Orçamento & Rate Limiting](#7-controle-de-custos-orçamento--rate-limiting)
8. [Performance & Cache de Respostas na Edge](#8-performance--cache-de-respostas-na-edge)
9. [Compatibilidade de APIs (OpenAI & Anthropic)](#9-compatibilidade-de-apis-openai--anthropic)
10. [Ferramentas Multimodais, Pesquisa & Compressão](#10-ferramentas-multimodais-pesquisa--compressão)
11. [Painel Administrativo Single-Page (GUI Web)](#11-painel-administrativo-single-page-gui-web)
12. [Matriz de Endpoints da API](#12-matriz-de-endpoints-da-api)
13. [Guia de Variáveis de Ambiente & Bindings](#13-guia-de-variáveis-de-ambiente--bindings)

---

## 1. Visão Geral da Arquitetura

O **VeroRoute Edge** é um Gateway de Inteligência Artificial nativo para o **Cloudflare Workers**. Ele intercepta, sanitiza, autentica, otimiza e roteia requisições de modelos de linguagem (LLMs) diretamente nos 300+ datacenters da Cloudflare ao redor do mundo.

- **Zero Servidores Dedicados**: Executa 100% em **V8 Isolates** com tempo de inicialização de ~15ms.
- **Persistência Global**: Utiliza Cloudflare **KV** (`OMNI_CACHE` e `OMNI_KEYS`) para estados de chaves virtuais, contadores de rate limit e cooldowns.
- **Suporte Nativo a Workers AI**: Acesso gratuito e integrado aos modelos hospedados na Cloudflare (`@cf/*`).

---

## 2. Matriz de Provedores Suportados

O sistema suporta **17+ provedores integrados** e suporte a **provedores customizados ilimitados**:

| Provedor | Tipo de Autenticação | Tool Calling Nativo | Tool Calling Emulado | Streaming SSE |
|---|---|:---:|:---:|:---:|
| **OpenAI** | Bearer Header | ✅ | — | ✅ |
| **Azure OpenAI** | API Key Header / Endpoint Custom | ✅ | — | ✅ |
| **AWS Bedrock** | API Key / AWS Bearer | ✅ | — | ✅ |
| **Google Gemini** | Query Param / Bearer | ✅ | — | ✅ |
| **Groq** | Bearer Header | ✅ | — | ✅ |
| **Cerebras** | Bearer Header | ✅ | — | ✅ |
| **DeepSeek** | Bearer Header | ✅ | — | ✅ |
| **Mistral AI** | Bearer Header | ✅ | — | ✅ |
| **OpenRouter** | Bearer Header | ✅ | — | ✅ |
| **SambaNova** | Bearer Header | ✅ | — | ✅ |
| **Alibaba DashScope** | Bearer Header | ✅ | — | ✅ |
| **Cloudflare Workers AI** | Binding Nativo (`env.AI`) | ❌ | ✅ | ✅ |
| **1min AI** | Bearer Header | ❌ | ✅ | ✅ |
| **Pollinations AI** | Sem necessidade de chave / Public | ❌ | ✅ | ✅ |
| **FreeAPIKey** | Bearer Header | ✅ | — | ✅ |
| **Antigravity (Google Code Assist)** | OAuth 2.0 (Refresh Token no KV) | ✅ | — | ✅ |
| **Provedores Customizados** | Bearer / Custom Header | Configurável | Configurável | ✅ |

---

## 3. Módulo de Roteamento & Roteador Cascade

O coração do VeroRoute Edge é o seu **Cascade Router**, responsável por garantir 99.99% de disponibilidade mesmo com falhas de provedores upstream.

### Estratégias de Roteamento Disponíveis:
1. **Priority (Padrão)**: Tenta os provedores na ordem estrita de prioridade definida.
2. **Weighted (Ponderado)**: Distribui requisições com base nos pesos atribuídos (`weight: 70/30`).
3. **Round-Robin**: Alterna sequencialmente entre todos os candidatos disponíveis.
4. **P2C (Power of Two Choices)**: Escolhe aleatoriamente 2 candidatos e seleciona o de menor carga/latência.
5. **Fill-First**: Enche a capacidade do primeiro provedor antes de passar para o próximo.
6. **Least-Used**: Seleciona o provedor com menor número de requisições acumuladas.
7. **Cost (Menor Custo)**: Roteia para o provedor com menor preço por milhão de tokens.
8. **Reset-Aware**: Prioriza provedores cujas janelas de rate limit foram resetadas recentemente.
9. **LKGP (Last Known Good Provider)**: Reutiliza o último provedor que respondeu com sucesso.
10. **Session-Affinity**: Mantém o mesmo provedor para a mesma sessão de usuário (`X-Session-ID`).
11. **Auto-Combo**: Seleção dinâmica de combos de modelos (ex: `combo-fast`, `combo-smart`, `combo-code`).

### Funcionalidades do Cascade:
- **Fallback Automático**: Em respostas HTTP 429 (Rate Limit) ou 5xx (Erro do Servidor), o sistema tenta instantaneamente o próximo candidato da fila.
- **Cooldown Persistido em KV**: Provedores que retornam 429 entram em cooldown automático de 60 segundos registrado no KV.
- **Retry com Backoff Exponencial**: Tenta re-executar a requisição com atraso configurável (`RETRY_DELAY_MS`) até o limite de `MAX_RETRIES`.

---

## 4. Emulação Universal de Tool Calling

Para modelos que **não suportam chamada de funções nativamente** (ex: Cloudflare Workers AI `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, Pollinations, 1min AI), o VeroRoute Edge fornece um sistema transparente de emulação.

### Funcionalidades:
- **Injeção de Prompt do Sistema**: Injeta instruções formatadas em JSON com os schemas das ferramentas declaradas no campo `tools`.
- **Parser de Extração JSON**: Captura blocos JSON ou chamadas de função da resposta de texto cru do modelo.
- **Suporte a `tool_choice`**:
  - `none`: Impede a execução de ferramentas.
  - `required` / `{"type":"function", "function":{"name":"..."}}`: Força a chamada de uma ferramenta específica (lança erro 400 caso o modelo não chame).
- **Gerador de Streaming SSE de Tools**: Quando o cliente solicita `stream: true`, o emulador acumula o stream do modelo, extrai a ferramenta e emite chunks válidos no formato OpenAI SSE com deltas `tool_calls` e término em `[DONE]`.

---

## 5. Segurança, Autenticação & Gestão de Acesso

- **AUTH_TOKEN Mestre Obrigatório**: O gateway roda em modo *Fail-Closed*. Se a variável `AUTH_TOKEN` não estiver definida, o gateway retorna HTTP 503 Service Unavailable.
- **Chaves Virtuais (`sk-vr-*`)**: Chaves criadas pelo painel admin com permissões granulares:
  - Nome / Descrição
  - Lista de modelos permitidos (`allowedModels`)
  - Limite de requisições por minuto (`rpmLimit`)
  - Limite de orçamento diário e mensal em USD.
- **Comparação Timing-Safe**: Validação de tokens de acesso feita através de digest SHA-256 via `crypto.subtle.timingSafeEqual` para prevenir ataques de temporização (Timing Attacks).
- **Sanitização de Erros Upstream**: Erros de provedores externos são higienizados antes de serem retornados ao cliente. URLs internas, chaves de API e mensagens sensíveis são removidas.
- **Isolamento de CORS no Admin**: As rotas administrativos (`/api/admin/*`) restringem preflights de origens cruzadas não autorizadas.

---

## 6. Resiliência, Timeouts & Circuit Breakers

- **Timeout por Candidato (`CASCADE_TIMEOUT_MS`)**: Cada tentativa de conexão com provedor possui um timeout estrito (padrão 45s) com interrupção limpa do corpo via `AbortSignal`.
- **Circuit Breaker de Provedor**:
  - Conta falhas consecutivas de cada provedor.
  - Ao atingir **5 falhas consecutivas**, o circuito muda para o estado **OPEN** (Aberto) por **5 minutos**.
  - Requisições durante o estado aberto ignoram o provedor instável sem perdas de tempo de conexão.
  - Após 5 minutos, o circuito entra em **HALF-OPEN** para testar a recuperação do serviço.

---

## 7. Controle de Custos, Orçamento & Rate Limiting

- **Contador de Tokens Real-time**: Calcula tokens de prompt e conclusão processados por chave virtual.
- **Calculadora de Custo em USD**: Estima o valor financeiro das requisições com base na tabela de preços por milhão de tokens de cada modelo.
- **Bloqueio por Orçamento (`dailyBudgetUsd` / `monthlyBudgetUsd`)**: Quando uma chave atinge seu orçamento limite, o gateway bloqueia novas requisições com status **HTTP 402 Payment Required**.
- **Rate Limit em Janela Deslizante (RPM)**: Limita o número de requisições por minuto de cada chave virtual via KV.
- **Quota Global de KV**: Protege o sistema contra abuso com limite deslizante global (`QUOTA_MAX_REQUESTS` / `QUOTA_WINDOW_SECONDS`).

---

## 8. Performance & Cache de Respostas na Edge

- **Cache de Respostas na Edge (Cloudflare Cache API)**:
  - Ativado para requisições determinísticas onde `temperature <= 0.1` e `stream: false`.
  - Gera hash SHA-256 das mensagens, modelo e parâmetros.
  - Respostas cacheadas retornam com header `X-Cache: HIT` em menos de **200ms**.
  - TTL do cache configurável via `CACHE_TTL_SECONDS` (padrão 3600s).

---

## 9. Compatibilidade de APIs (OpenAI & Anthropic)

- **OpenAI Chat Completions (`/v1/chat/completions`)**: Suporte completo a streaming SSE, `tools`, `response_format: { type: "json_object" }`, `temperature`, `top_p`, `presence_penalty`, etc.
- **OpenAI Responses Format (`/v1/responses`)**: Adaptador nativo para o formato de respostas da OpenAI.
- **Anthropic Messages API (`/v1/messages`)**: Aceita requisições no formato Claude e traduz transparentemente para o formato interno do gateway.
- **OpenAI Model Listing (`/v1/models`)**: Retorna a lista unificada de todos os modelos disponíveis no gateway (nativos, combos e provedores ativados).

---

## 10. Ferramentas Multimodais, Pesquisa & Compressão

- **Modality Bridge**: Transcreve imagens enviadas em requisições multimodais para modelos que aceitam apenas texto, utilizando modelos de visão secundários.
- **Jina Reader Web Scraping**: Transforma URLs enviadas nas mensagens em conteúdo Markdown limpo automaticamente.
- **SearXNG / Tavily / Serper Search Hub**: Permite busca na web integrada para complementar o contexto do modelo.
- **Compressão de Contexto**: Otimiza prompts longos removendo redundâncias para economizar tokens.

---

## 11. Painel Administrativo Single-Page (GUI Web)

O gateway possui uma interface visual integrada acessível diretamente no navegador através de autenticação com o `AUTH_TOKEN` mestre:

- 🔑 **Gestão de Chaves Virtuais**: Criação, revogação e monitoramento de limites de orçamento e uso.
- 🔀 **Criador de Combos**: Criação de modelos personalizados agrupando múltiplos provedores sob uma única chave/modelo.
- ⚙️ **Configuração de Provedores Customizados**: Adição de qualquer API compatível com OpenAI informando Base URL e chave.
- 📊 **Painel de Métricas**: Monitoramento de consumo de tokens, custos acumulados e taxa de requisições.
- 🔴 **Monitor de Circuit Breakers**: Visualização em tempo real do estado de cada provedor (Closed, Open, Half-Open).
- 🏆 **Presets ELO / Benchmark**: Modelos pré-configurados baseados em classificações de desempenho.

---

## 12. Matriz de Endpoints da API

| Endpoint | Método | Autenticação | Descrição |
|---|---|---|---|
| `/health` | GET | Nenhum | Status e versão do gateway |
| `/v1/models` | GET | Bearer (`sk-vr-*` ou Master) | Lista de modelos disponíveis |
| `/v1/chat/completions` | POST | Bearer (`sk-vr-*` ou Master) | Endpoint principal de chat completion |
| `/v1/messages` | POST | Bearer (`sk-vr-*` ou Master) | Endpoint compatível com Anthropic Claude |
| `/v1/responses` | POST | Bearer (`sk-vr-*` ou Master) | Adaptador OpenAI Responses |
| `/api/admin/config` | GET/POST | Bearer Mestre (`AUTH_TOKEN`) | Leitura e atualização da configuração mestre |
| `/api/admin/keys` | GET/POST/DELETE | Bearer Mestre (`AUTH_TOKEN`) | Gestão de Chaves Virtuais |
| `/api/admin/combos` | GET/POST/DELETE | Bearer Mestre (`AUTH_TOKEN`) | Gestão de Combos de Roteamento |
| `/api/admin/circuits` | GET | Bearer Mestre (`AUTH_TOKEN`) | Leitura do estado dos Circuit Breakers |
| `/api/admin/usage/:keyId` | GET | Bearer Mestre (`AUTH_TOKEN`) | Leitura do consumo e custo de uma chave |
| `/api/admin/presets` | GET | Bearer Mestre (`AUTH_TOKEN`) | Presets de provedores gratuitos |
| `/api/admin/providers/:id/keys` | POST/DELETE | Bearer Mestre (`AUTH_TOKEN`) | Adição ao pool e limpeza de chaves de API |
| `/api/admin/providers/:id/models` | POST/DELETE | Bearer Mestre (`AUTH_TOKEN`) | Adição em lote e remoção de modelos do provedor |
| `/api/admin/providers/:id/fetch-models` | POST | Bearer Mestre (`AUTH_TOKEN`) | Descoberta dinâmica de modelos via API upstream e catálogo |
| `/api/oauth/antigravity/*` | GET/POST | Bearer Mestre (`AUTH_TOKEN`) | Fluxo de autenticação OAuth para Google Code Assist |

---

## 13. Guia de Variáveis de Ambiente & Bindings

### Cloudflare Bindings (wrangler.jsonc):
- `AI`: Binding do Cloudflare Workers AI.
- `OMNI_CACHE`: KV Namespace para cache de respostas e cooldowns de chaves.
- `OMNI_KEYS`: KV Namespace para chaves virtuais, tokens OAuth e orçamentos.

### Variáveis de Ambiente (Vars & Secrets):
- `AUTH_TOKEN`: Token Mestre obrigatório.
- `DEFAULT_ROUTING_STRATEGY`: Estratégia de roteamento padrão (`priority`).
- `MAX_RETRIES`: Número máximo de retries por candidato (`3`).
- `RETRY_DELAY_MS`: Atraso base para retries em ms (`1000`).
- `CASCADE_TIMEOUT_MS`: Timeout individual por candidato em ms (`45000`).
- `CACHE_TTL_SECONDS`: Tempo de vida do cache em segundos (`3600`).
- `QUOTA_MAX_REQUESTS`: Requisições máximas por janela global (`1000`).
- `QUOTA_WINDOW_SECONDS`: Duração da janela global em segundos (`60`).
- Chaves de Provedores: `OPENAI_API_KEYS`, `GEMINI_API_KEYS`, `GROQ_API_KEYS`, `DEEPSEEK_API_KEYS`, `CEREBRAS_API_KEYS`, `SAMBANOVA_API_KEYS`, `MISTRAL_API_KEYS`, `OPENROUTER_API_KEYS`, `POLLINATIONS_API_KEYS`, `ONE_MIN_API_KEYS`.

---

*Documento gerado automaticamente para exportação — VeroRoute Edge v1.0.0*
