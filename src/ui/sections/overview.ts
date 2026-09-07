/**
 * Seção de Visão Geral & Hero Institucional do VeroRoute Edge
 */

export function renderOverviewSection(): string {
  return `
    <div id="tab-overview" class="tab-pane active">
      <!-- HERO -->
      <section class="hero-container">
        <div class="hero-content">
          <div class="hero-pill-badge">
            <span class="dot"></span>
            <span>Cloudflare Workers Serverless • v1.0.0</span>
          </div>

          <h1 class="hero-title">
            Engine de Roteamento Inteligente & <span class="highlight">Gateway de IA</span> na Edge
          </h1>

          <p class="hero-description">
            O <strong>VeroRoute Edge</strong> unifica e acelera o acesso a mais de 17 provedores de IA (OpenAI, Claude, Gemini, Groq, DeepSeek, Workers AI e mais) com fallback em cascata em tempo real, emulação universal de tool calling e cache global distribuído em 300+ cidades.
          </p>

          <div class="hero-cta-group">
            <button class="btn" onclick="showTab('docs')">
              📖 Ler Documentação Completa
            </button>
            <button class="btn btn-secondary" onclick="showTab('deploy')">
              🚀 Deploy & Domínio Personalizado
            </button>
            <a href="https://github.com/samucamg/veroroute-edge" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub Oficial
            </a>
          </div>
        </div>

        <div class="hero-visual">
          <div class="hero-logo-card">
            <img 
              src="https://cdn.inglescurso.org/file/1bcQSpD9hFiY_mSP8ZwmdynzrWz1kDijY/veroroute-edge_1788803925.png" 
              alt="VeroRoute Edge Logo" 
              class="hero-logo-img"
              loading="eager"
            />
            <div class="hero-card-title">VeroRoute Edge</div>
            <div class="hero-card-desc">Serverless AI Gateway & Smart Cascade Router</div>
            <div style="display:flex; gap:0.5rem; flex-wrap:wrap; justify-content:center;">
              <span class="badge badge-cyan">Zero Servidores</span>
              <span class="badge badge-green">99.99% Uptime</span>
              <span class="badge badge-purple">Fail-Closed</span>
            </div>
          </div>
        </div>
      </section>

      <!-- STATS GRID -->
      <div class="grid-stats">
        <div class="stat-card">
          <div class="stat-title">Provedores & Modelos</div>
          <div class="stat-val" id="stat-total-models">4.390+</div>
          <div class="stat-sub">17 Provedores Nativos + Custom</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Roteador em Cascata</div>
          <div class="stat-val" style="color: var(--emerald);">Ativo</div>
          <div class="stat-sub">Fallback automático em HTTP 429/5xx</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Tool Calling Universal</div>
          <div class="stat-val" style="color: var(--primary);">Emulado</div>
          <div class="stat-sub">Injeção JSON + SSE Delta Stream</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Arquitetura de Execução</div>
          <div class="stat-val">Edge V8</div>
          <div class="stat-sub">~15ms cold start em 300+ PoPs</div>
        </div>
      </div>

      <!-- ARQUITETURA EM DIAGRAMA VISUAL -->
      <div class="card">
        <div class="card-title">
          <span>⚡</span> Fluxo de Roteamento na Edge da Cloudflare
        </div>
        <p class="card-subtitle">
          Veja como cada requisição é tratada com segurança, sanitização, resiliência e alta disponibilidade desde a entrada até a resposta.
        </p>

        <div class="code-container">
          <div class="code-header">
            <span>ARQUITETURA DE PIPELINE DO GATEWAY</span>
            <span>CLOUDFLARE V8 ISOLATES</span>
          </div>
          <pre class="code-content"><code>[Cliente / IDE]  ➔  Cursor, VS Code, Cline, Claude Code, Python, cURL
        │
        ▼  HTTPS / TLS 1.3 (veroroute.24hs.eu.org)
[Cloudflare Edge] ➔  300+ Cidades Globais (~15ms Cold Start)
        │
        ├── 1. Autenticação Fail-Closed (AUTH_TOKEN ou Chave Virtual sk-vr-*)
        │      SHA-256 timingSafeEqual (proteção total contra Timing Attacks)
        │
        ├── 2. Rate Limiting & Orçamento (Sliding Window RPM + USD Budgets no KV)
        │
        ├── 3. Sanitização de Mensagens & Compressão de Contexto
        │
        ├── 4. Response Cache Edge (Cache API para temp &lt;= 0.1, resposta &lt; 200ms)
        │
        ▼
[Cascade Router]  ➔  11 Estratégias: Priority | Weighted | P2C | Least-Cost...
        │
        ├── Tenta Provedor #1 (ex: Groq / Llama 3.3)
        │      └── 429 Rate Limit ou Timeout? Cooldown 60s em KV ➔ Fallback
        │
        ├── Tenta Provedor #2 (ex: Gemini 2.0 Flash)
        │      └── Sucesso! ➔ Transmite resposta
        │
        ▼
[Tool Calling Emulator] ➔ Emulação inteligente de Function Calling para modelos sem suporte
        │
        ▼
[Streaming SSE / JSON]  ➔ Entrega ultra-rápida ao usuário com métricas e headers X-Cache</code></pre>
        </div>
      </div>

      <!-- DESTAQUES PRINCIPAIS -->
      <div class="card">
        <div class="card-title">
          <span>🌟</span> Por que o VeroRoute Edge é Diferente?
        </div>
        <p class="card-subtitle">
          Recursos projetados especificamente para desenvolvedores e empresas que necessitam de estabilidade ininterrupta em chamadas de IA.
        </p>

        <div class="grid-features">
          <div class="feature-card">
            <span class="feature-icon">🛡️</span>
            <div class="feature-title">Fallback em Cascata Resiliente</div>
            <div class="feature-desc">
              Nunca mais sofra com erros 429 de Rate Limit. Se um provedor falhar, o gateway chaveia em milissegundos para o próximo candidato configurado.
            </div>
          </div>

          <div class="feature-card">
            <span class="feature-icon">🧩</span>
            <div class="feature-title">Emulação Universal de Tools</div>
            <div class="feature-desc">
              Execute Function Calling e Agents em modelos que não suportam tools nativamente (ex: Workers AI, Pollinations, 1min AI) com streaming delta OpenAI.
            </div>
          </div>

          <div class="feature-card">
            <span class="feature-icon">⚡</span>
            <div class="feature-title">100% Serverless na Cloudflare</div>
            <div class="feature-desc">
              Zero servidores virtuais ou contêineres Docker para gerenciar. Escalabilidade automática para milhões de requisições com custo fixo $0.
            </div>
          </div>

          <div class="feature-card">
            <span class="feature-icon">🔑</span>
            <div class="feature-title">Chaves Virtuais & Orçamentos</div>
            <div class="feature-desc">
              Crie chaves virtuais (<code>sk-vr-...</code>) com modelos específicos permitidos, limites de RPM e tetos diários/mensais em USD.
            </div>
          </div>

          <div class="feature-card">
            <span class="feature-icon">👁️</span>
            <div class="feature-title">Ponte Multimodal & Web RAG</div>
            <div class="feature-desc">
              Envie imagens para qualquer modelo: a ponte transcreve visualmente via visão secundária. Inclui busca web DuckDuckGo/SearXNG e leitor Jina Reader.
            </div>
          </div>

          <div class="feature-card">
            <span class="feature-icon">🏎️</span>
            <div class="feature-title">Cache Edge Inteligente</div>
            <div class="feature-desc">
              Consultas idênticas determinísticas retornam direto da memória cache da Cloudflare em menos de 200ms, economizando custos e tokens.
            </div>
          </div>
        </div>
      </div>

      <!-- QUICK START CODE -->
      <div class="card">
        <div class="card-title">
          <span>🚀</span> Teste Rápido em 1 Minuto (cURL)
        </div>
        <p class="card-subtitle">
          Execute diretamente no seu terminal para validar sua conexão com o VeroRoute Edge:
        </p>

        <div class="code-container">
          <div class="code-header">
            <span>BASH / TERMINAL</span>
            <button class="copy-btn" onclick="copyCode(this)">Copiar</button>
          </div>
          <pre class="code-content"><code>curl -X POST "https://veroroute.24hs.eu.org/v1/chat/completions" \\
  -H "Authorization: Bearer SEU_AUTH_TOKEN_OU_CHAVE_VIRTUAL" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gemini-2.5-flash",
    "messages": [
      {"role": "user", "content": "Olá VeroRoute Edge! Qual a sua latência atual?"}
    ]
  }'</code></pre>
        </div>
      </div>
    </div>
  `;
}
