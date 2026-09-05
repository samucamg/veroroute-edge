/**
 * Dashboard Visual do VeroRoute Edge (SPA Embutida, Glassmorphism, Dark Mode)
 */

export function renderDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VeroRoute Edge — Serverless AI Gateway</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: rgba(18, 24, 38, 0.7);
      --card-border: rgba(255, 255, 255, 0.08);
      --card-hover: rgba(255, 255, 255, 0.12);
      --primary: #38bdf8;
      --primary-glow: rgba(56, 189, 248, 0.25);
      --accent: #818cf8;
      --emerald: #10b981;
      --emerald-glow: rgba(16, 185, 129, 0.2);
      --amber: #f59e0b;
      --rose: #f43f5e;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Outfit', sans-serif;
      background: radial-gradient(circle at top, #131d36 0%, #080c14 100%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }

    header {
      background: rgba(11, 15, 25, 0.85);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--card-border);
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .brand-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 15px var(--primary-glow);
    }

    .brand-title {
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.5px;
      background: linear-gradient(to right, #fff, #93c5fd);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .badge-edge {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 9999px;
      background: rgba(56, 189, 248, 0.15);
      color: var(--primary);
      border: 1px solid rgba(56, 189, 248, 0.3);
      text-transform: uppercase;
    }

    nav {
      display: flex;
      gap: 0.5rem;
    }

    .nav-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 0.9rem;
      font-weight: 500;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .nav-btn:hover {
      color: var(--text);
      background: rgba(255, 255, 255, 0.05);
    }

    .nav-btn.active {
      color: var(--primary);
      background: rgba(56, 189, 248, 0.1);
      font-weight: 600;
    }

    main {
      flex: 1;
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }

    .tab-pane { display: none; }
    .tab-pane.active { display: block; animation: fadeIn 0.3s ease; }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .grid-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 1.25rem;
      backdrop-filter: blur(12px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    }

    .stat-title {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
    }

    .stat-val {
      font-size: 1.75rem;
      font-weight: 700;
      color: #fff;
    }

    .stat-sub {
      font-size: 0.75rem;
      color: var(--emerald);
      margin-top: 0.25rem;
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      backdrop-filter: blur(12px);
    }

    .card-title {
      font-size: 1.15rem;
      font-weight: 600;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .provider-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }

    .provider-box {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .provider-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .provider-name {
      font-weight: 600;
      font-size: 0.95rem;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--emerald);
      box-shadow: 0 0 8px var(--emerald);
    }

    .btn {
      background: linear-gradient(135deg, var(--primary), var(--accent));
      color: #fff;
      border: none;
      padding: 0.6rem 1.25rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: opacity 0.2s;
    }

    .btn:hover { opacity: 0.9; }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text);
      border: 1px solid var(--card-border);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    input, select, textarea {
      width: 100%;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid var(--card-border);
      color: #fff;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      font-family: inherit;
      font-size: 0.9rem;
      margin-top: 0.5rem;
    }

    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: var(--primary);
    }

    pre, code {
      font-family: 'JetBrains Mono', monospace;
    }

    .code-box {
      background: #050811;
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 1rem;
      font-size: 0.85rem;
      overflow-x: auto;
      color: #38bdf8;
      position: relative;
    }

    .chat-box {
      display: flex;
      flex-direction: column;
      height: 400px;
      border: 1px solid var(--card-border);
      border-radius: 12px;
      background: rgba(0, 0, 0, 0.25);
      overflow-y: auto;
      padding: 1rem;
      gap: 1rem;
    }

    .msg {
      max-width: 80%;
      padding: 0.75rem 1rem;
      border-radius: 12px;
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .msg-user {
      align-self: flex-end;
      background: #1e3a8a;
      color: #fff;
    }

    .msg-bot {
      align-self: flex-start;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--card-border);
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-icon">⚡</div>
      <div>
        <div class="brand-title">VeroRoute Edge</div>
      </div>
      <span class="badge-edge">Serverless Edge</span>
    </div>
    <nav>
      <button class="nav-btn active" onclick="showTab('overview')">Visão Geral</button>
      <button class="nav-btn" onclick="showTab('providers')">Provedores</button>
      <button class="nav-btn" onclick="showTab('search')">Busca Web & RAG</button>
      <button class="nav-btn" onclick="showTab('antigravity')">Antigravity OAuth</button>
      <button class="nav-btn" onclick="showTab('combos')">Combos & Quotas</button>
      <button class="nav-btn" onclick="showTab('playground')">Playground</button>
      <button class="nav-btn" onclick="showTab('docs')">Clientes</button>
    </nav>
  </header>

  <main>
    <!-- TAB 1: VISÃO GERAL -->
    <div id="tab-overview" class="tab-pane active">
      <div class="grid-stats">
        <div class="stat-card">
          <div class="stat-title">Modelos Conectados</div>
          <div class="stat-val" id="total-models">4.396+</div>
          <div class="stat-sub">12 Provedores Principais</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Cascata & Fallback</div>
          <div class="stat-val" style="color: var(--emerald);">Ativa</div>
          <div class="stat-sub">Auto-chaveamento em 429</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Compartilhamento de Cota</div>
          <div class="stat-val" style="color: var(--primary);">Fair-Share</div>
          <div class="stat-sub">Work-Conserving Burst Mode</div>
        </div>
        <div class="stat-card">
          <div class="stat-title">Infraestrutura</div>
          <div class="stat-val">Serverless</div>
          <div class="stat-sub">Cloudflare V8 Isolates</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">🚀 Endpoint Universal de IA</div>
        <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 1rem;">
          Substitua a URL da OpenAI em qualquer biblioteca, SDK ou cliente pelo seu endpoint do VeroRoute Edge:
        </p>
        <div class="code-box">
          <span id="endpoint-url">https://seu-worker.workers.dev/v1</span>
        </div>
      </div>

      <div class="card">
        <div class="card-title">💡 Inspiração e Origem</div>
        <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.6;">
          O <strong>VeroRoute Edge</strong> foi concebido como uma alternativa <strong>ultra-leve e 100% serverless</strong> inspirada na robustez de estratégias do <strong>OmniRoute</strong> e na arquitetura de economia de tokens do <strong>VeroRoute</strong>. Ao migrar a lógica de proxy e roteamento para o ambiente de V8 Isolates do Cloudflare Workers, eliminamos a necessidade de containers Docker pesados de 1GB+, Redis e bancos de dados externos para operação contínua.
        </p>
      </div>
    </div>

    <!-- TAB 2: PROVEDORES -->
    <div id="tab-providers" class="tab-pane">
      <div class="card">
        <div class="card-title">🌐 Provedores Corporativos & Gratuitos Configurados</div>
        <div class="provider-grid">
          <!-- 1min.ai -->
          <div class="provider-box">
            <div class="provider-header">
              <span class="provider-name">1min.ai (com Tool Calling)</span>
              <span class="status-dot"></span>
            </div>
            <span style="font-size: 0.8rem; color: var(--text-muted);">ReAct Emulation · GPT-4o, Claude 3.5</span>
            <span style="font-size: 0.75rem; color: var(--primary);">Modelos: 1min/gpt-4o, 1min/claude-3-5-sonnet</span>
          </div>

          <!-- Alibaba DashScope -->
          <div class="provider-box">
            <div class="provider-header">
              <span class="provider-name">Alibaba Cloud (DashScope / Qwen)</span>
              <span class="status-dot"></span>
            </div>
            <span style="font-size: 0.8rem; color: var(--text-muted);">Free-tier generoso · Qwen 2.5 Coder</span>
            <span style="font-size: 0.75rem; color: var(--primary);">Modelos: qwen-max, qwen-plus, qwen2.5-coder</span>
          </div>

          <!-- OpenAI Oficial -->
          <div class="provider-box">
            <div class="provider-header">
              <span class="provider-name">OpenAI Oficial</span>
              <span class="status-dot"></span>
            </div>
            <span style="font-size: 0.8rem; color: var(--text-muted);">Modelos Flagship de Referência</span>
            <span style="font-size: 0.75rem; color: var(--primary);">Modelos: gpt-4o, gpt-4o-mini, o3-mini</span>
          </div>

          <!-- Google Gemini -->
          <div class="provider-box">
            <div class="provider-header">
              <span class="provider-name">Google Gemini (AI Studio)</span>
              <span class="status-dot"></span>
            </div>
            <span style="font-size: 0.8rem; color: var(--text-muted);">60M tokens/mês grátis · 15 RPM</span>
            <span style="font-size: 0.75rem; color: var(--primary);">Modelos: gemini-2.5-flash, 2.0-flash, 2.5-pro</span>
          </div>

          <!-- Antigravity CLI -->
          <div class="provider-box">
            <div class="provider-header">
              <span class="provider-name">Antigravity CLI (Code Assist)</span>
              <span class="status-dot"></span>
            </div>
            <span style="font-size: 0.8rem; color: var(--text-muted);">OAuth Google · Gemini 2.5 Pro & Claude 3.7</span>
            <span style="font-size: 0.75rem; color: var(--primary);">Modelos: antigravity/gemini-2.5-pro</span>
          </div>

          <!-- Groq -->
          <div class="provider-box">
            <div class="provider-header">
              <span class="provider-name">Groq Cloud</span>
              <span class="status-dot"></span>
            </div>
            <span style="font-size: 0.8rem; color: var(--text-muted);">14.4k req/dia · 500+ tokens/seg</span>
            <span style="font-size: 0.75rem; color: var(--primary);">Modelos: llama-3.3-70b-versatile, mixtral</span>
          </div>

          <!-- Cerebras -->
          <div class="provider-box">
            <div class="provider-header">
              <span class="provider-name">Cerebras Inference</span>
              <span class="status-dot"></span>
            </div>
            <span style="font-size: 0.8rem; color: var(--text-muted);">1M tokens/dia · 2.000 tokens/seg</span>
            <span style="font-size: 0.75rem; color: var(--primary);">Modelos: cerebras/llama3.3-70b</span>
          </div>

          <!-- Cloudflare AI -->
          <div class="provider-box">
            <div class="provider-header">
              <span class="provider-name">Cloudflare Workers AI (Nativo)</span>
              <span class="status-dot"></span>
            </div>
            <span style="font-size: 0.8rem; color: var(--text-muted);">10k neurônios/dia · Zero credencial</span>
            <span style="font-size: 0.75rem; color: var(--primary);">Modelos: Llama 3.3 70B FP8, DeepSeek R1</span>
          </div>

          <!-- Pollinations -->
          <div class="provider-box">
            <div class="provider-header">
              <span class="provider-name">Pollinations.ai (Keyless)</span>
              <span class="status-dot"></span>
            </div>
            <span style="font-size: 0.8rem; color: var(--text-muted);">Fallback ilimitado e sem chave</span>
            <span style="font-size: 0.75rem; color: var(--primary);">Modelos: openai, mistral, claude</span>
          </div>

          <!-- FreeAPIKey -->
          <div class="provider-box">
            <div class="provider-header">
              <span class="provider-name">FreeAPIKey (Agregador)</span>
              <span class="status-dot"></span>
            </div>
            <span style="font-size: 0.8rem; color: var(--text-muted);">Rotas gratuitas multi-provedor</span>
            <span style="font-size: 0.75rem; color: var(--primary);">Modelos: gpt-4o-mini, claude-3-haiku</span>
          </div>

          <!-- Azure OpenAI -->
          <div class="provider-box">
            <div class="provider-header">
              <span class="provider-name">Azure OpenAI</span>
              <span class="status-dot"></span>
            </div>
            <span style="font-size: 0.8rem; color: var(--text-muted);">Deployments corporativos dedicados</span>
            <span style="font-size: 0.75rem; color: var(--primary);">Modelos: azure/gpt-4o</span>
          </div>

          <!-- Amazon Bedrock -->
          <div class="provider-box">
            <div class="provider-header">
              <span class="provider-name">Amazon Bedrock</span>
              <span class="status-dot"></span>
            </div>
            <span style="font-size: 0.8rem; color: var(--text-muted);">AWS Bedrock Claude & Llama</span>
            <span style="font-size: 0.75rem; color: var(--primary);">Modelos: bedrock/claude-3-5-sonnet</span>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: BUSCA WEB & RAG -->
    <div id="tab-search" class="tab-pane">
      <div class="card">
        <div class="card-title">🔍 Configuração de Busca Web & RAG</div>
        <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; margin-bottom: 1.5rem;">
          O VeroRoute Edge permite que qualquer modelo de IA consulte a web em tempo real através do endpoint <code>/v1/search</code> ou via flag <code>enable_search: true</code> no chat completions.
        </p>

        <div style="margin-bottom: 1.5rem;">
          <label style="font-weight: 600; font-size: 0.9rem;">URL da sua Instância SearXNG (Opcional):</label>
          <input type="text" id="custom-searx-url" placeholder="Ex: https://meusearxng.com (deixe vazio para usar DuckDuckGo gratuito)">
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.35rem;">
            Se você possuir uma instância própria do SearXNG, insira a URL acima. Se deixar vazio, o sistema utilizará automaticamente o <strong>DuckDuckGo (zero chaves e zero custo)</strong> ou <strong>Tavily</strong>.
          </p>
          <button class="btn btn-secondary" style="margin-top: 0.75rem;" onclick="saveSearxUrl()">Salvar Configuração</button>
        </div>

        <div class="code-box">
Exemplo de Busca via cURL:
curl -X POST https://seu-worker.workers.dev/v1/search \\
  -H "Content-Type: application/json" \\
  -d '{"query": "Últimas notícias sobre inteligência artificial", "limit": 5}'
        </div>
      </div>
    </div>

    <!-- TAB 4: ANTIGRAVITY OAUTH -->
    <div id="tab-antigravity" class="tab-pane">
      <div class="card">
        <div class="card-title">🔐 Conexão OAuth com Antigravity CLI / Google Cloud Code Assist</div>
        <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; margin-bottom: 1.5rem;">
          Conecte sua conta do Google para utilizar o Claude 3.7 Sonnet e Gemini 2.5 Pro através dos endpoints oficiais do Code Assist (usados nativamente pelo Antigravity CLI).
        </p>

        <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem;">
          <a href="/api/oauth/antigravity/authorize" class="btn">
            🔗 Conectar com Google (Antigravity OAuth)
          </a>
        </div>

        <div style="border-top: 1px solid var(--card-border); padding-top: 1.5rem;">
          <h4 style="font-size: 1rem; margin-bottom: 0.75rem;">Importação Manual de Credenciais (Tokens Antigravity)</h4>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">
            Se já estiver autenticado na máquina local, cole abaixo seu <code>refresh_token</code> ou o JSON de credenciais:
          </p>
          <textarea id="agy-token-input" rows="4" placeholder="Cole aqui seu refresh_token ou JSON de credenciais do Antigravity..."></textarea>
          <button class="btn btn-secondary" style="margin-top: 0.75rem;" onclick="saveAgyToken()">Salvar Credenciais no Worker</button>
        </div>
      </div>
    </div>

    <!-- TAB 5: COMBOS & QUOTA SHARING -->
    <div id="tab-combos" class="tab-pane">
      <div class="card">
        <div class="card-title">⚖️ Compartilhamento de Cota (Work-Conserving Fair-Share)</div>
        <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; margin-bottom: 1rem;">
          O algoritmo de <strong>Compartilhamento de Cota</strong> divide inteligentemente a cota de contas gratuitas (como Gemini 60M tokens ou Cerebras 1M tokens/dia) entre diferentes usuários ou chaves de clientes:
        </p>
        <ul style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.6; margin-left: 1.5rem; margin-bottom: 1.5rem;">
          <li><strong>Modo Generoso (Headroom):</strong> Enquanto a saturação do pool for menor que 70%, qualquer usuário ativo pode "emprestar" da cota ociosa dos outros usuários.</li>
          <li><strong>Modo Restrito (Saturação >= 70%):</strong> Quando a demanda global sobe, o sistema passa a forçar fatias estritas de acordo com o peso de cada chave, garantindo equidade sem desperdício de cota.</li>
        </ul>

        <div class="provider-grid">
          <div class="provider-box">
            <div class="provider-header">
              <span class="provider-name">omni-free (Cascata Gratuita Total)</span>
              <span class="badge-edge">Prioridade</span>
            </div>
            <span style="font-size: 0.8rem; color: var(--text-muted);">
              1º Gemini Flash ➔ 2º Groq Llama 3.3 ➔ 3º Cerebras ➔ 4º Alibaba Qwen ➔ 5º Cloudflare AI ➔ 6º OpenRouter ➔ 7º Pollinations
            </span>
          </div>

          <div class="provider-box">
            <div class="provider-header">
              <span class="provider-name">omni-code (Especialista em Programação)</span>
              <span class="badge-edge">Prioridade</span>
            </div>
            <span style="font-size: 0.8rem; color: var(--text-muted);">
              1º Antigravity Gemini 2.5 Pro ➔ 2º 1min.ai GPT-4o ➔ 3º Qwen 2.5 Coder ➔ 4º Groq ➔ 5º Cerebras
            </span>
          </div>

          <div class="provider-box">
            <div class="provider-header">
              <span class="provider-name">omni-fast (Ultra-Velocidade)</span>
              <span class="badge-edge">P2C Load-Balance</span>
            </div>
            <span style="font-size: 0.8rem; color: var(--text-muted);">
              Distribuição inteligente entre Cerebras (2.000 t/s) e Groq (500 t/s)
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 6: PLAYGROUND -->
    <div id="tab-playground" class="tab-pane">
      <div class="card">
        <div class="card-title">🧪 Playground Interativo de Testes</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <div>
            <label style="font-size: 0.85rem; color: var(--text-muted);">Modelo / Combo:</label>
            <select id="chat-model">
              <option value="omni-free">omni-free (Cascata Inteligente Free)</option>
              <option value="omni-code">omni-code (Programação & 1min.ai)</option>
              <option value="gemini-2.5-flash">gemini-2.5-flash</option>
              <option value="1min/gpt-4o">1min.ai (GPT-4o com Tools)</option>
              <option value="qwen-max">qwen-max (Alibaba DashScope)</option>
              <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Groq)</option>
              <option value="cerebras/llama3.3-70b">cerebras/llama3.3-70b</option>
              <option value="@cf/meta/llama-3.3-70b-instruct-fp8-fast">Cloudflare Workers AI Llama 70B</option>
            </select>
          </div>
          <div>
            <label style="font-size: 0.85rem; color: var(--text-muted);">Estratégia de Roteamento:</label>
            <select id="chat-strategy">
              <option value="priority">Prioridade / Fallback</option>
              <option value="round-robin">Round Robin</option>
              <option value="p2c">P2C (Menor Fila)</option>
              <option value="cost">Menor Custo ($0)</option>
            </select>
          </div>
          <div>
            <label style="font-size: 0.85rem; color: var(--text-muted);">Busca Web (RAG):</label>
            <select id="chat-search">
              <option value="false">Desativada</option>
              <option value="true">Ativada (SearXNG / DDG)</option>
            </select>
          </div>
        </div>

        <div class="chat-box" id="chat-container">
          <div class="msg msg-bot">Olá! Eu sou o assistente do VeroRoute Edge. Envie uma mensagem para testar o streaming, auto-fallback, 1min.ai ou busca web em tempo real.</div>
        </div>

        <div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
          <input type="text" id="chat-input" placeholder="Digite sua mensagem aqui..." onkeydown="if(event.key==='Enter') sendMessage()">
          <button class="btn" onclick="sendMessage()">Enviar</button>
        </div>
      </div>
    </div>

    <!-- TAB 7: CLIENTES & INTEGRAÇÃO -->
    <div id="tab-docs" class="tab-pane">
      <div class="card">
        <div class="card-title">🔌 Como Usar no Cursor, Cline e Claude Code</div>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem;">
          Configure suas ferramentas de desenvolvimento apontando para este Worker:
        </p>

        <h4 style="margin: 1rem 0 0.5rem 0;">1. Cursor IDE</h4>
        <div class="code-box">
URL Base: https://seu-worker.workers.dev/v1
API Key: qualquer-texto (ou seu AUTH_TOKEN se configurado)
Modelos: omni-free, omni-code, 1min/gpt-4o, qwen-max, gemini-2.5-flash
        </div>

        <h4 style="margin: 1.5rem 0 0.5rem 0;">2. Claude Code CLI (Compatibilidade Nativa /v1/messages)</h4>
        <div class="code-box">
export ANTHROPIC_BASE_URL="https://seu-worker.workers.dev"
export ANTHROPIC_API_KEY="veroroute-edge"
claude
        </div>

        <h4 style="margin: 1.5rem 0 0.5rem 0;">3. Python (OpenAI SDK)</h4>
        <div class="code-box">
from openai import OpenAI

client = OpenAI(
    base_url="https://seu-worker.workers.dev/v1",
    api_key="veroroute-edge"
)

response = client.chat.completions.create(
    model="omni-free",
    messages=[{"role": "user", "content": "Olá!"}]
)
print(response.choices[0].message.content)
        </div>
      </div>
    </div>
  </main>

  <script>
    function showTab(tabId) {
      document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
      document.getElementById('tab-' + tabId).classList.add('active');
      event.target.classList.add('active');
    }

    document.getElementById('endpoint-url').innerText = window.location.origin + '/v1';

    async function sendMessage() {
      const input = document.getElementById('chat-input');
      const text = input.value.trim();
      if (!text) return;

      const container = document.getElementById('chat-container');
      const userDiv = document.createElement('div');
      userDiv.className = 'msg msg-user';
      userDiv.innerText = text;
      container.appendChild(userDiv);
      input.value = '';

      const botDiv = document.createElement('div');
      botDiv.className = 'msg msg-bot';
      botDiv.innerText = 'Pensando...';
      container.appendChild(botDiv);
      container.scrollTop = container.scrollHeight;

      const model = document.getElementById('chat-model').value;
      const strategy = document.getElementById('chat-strategy').value;
      const search = document.getElementById('chat-search').value === 'true';

      try {
        const res = await fetch('/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            routing_strategy: strategy,
            enable_search: search,
            stream: true,
            messages: [{ role: 'user', content: text }]
          })
        });

        if (!res.ok) {
          const err = await res.text();
          botDiv.innerText = 'Erro: ' + err;
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        botDiv.innerText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const parsed = JSON.parse(line.replace('data: ', ''));
                const delta = parsed.choices?.[0]?.delta?.content || '';
                fullText += delta;
                botDiv.innerText = fullText;
                container.scrollTop = container.scrollHeight;
              } catch {}
            }
          }
        }
      } catch (err) {
        botDiv.innerText = 'Erro na requisição: ' + err.message;
      }
    }

    async function saveAgyToken() {
      const val = document.getElementById('agy-token-input').value.trim();
      if (!val) return alert('Por favor, insira o token ou JSON');
      try {
        const res = await fetch('/api/oauth/antigravity/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: val })
        });
        const data = await res.json();
        if (data.ok) {
          alert('Credenciais salvas com sucesso!');
        } else {
          alert('Erro ao salvar: ' + (data.error || 'Desconhecido'));
        }
      } catch (e) {
        alert('Erro: ' + e.message);
      }
    }

    function saveSearxUrl() {
      const url = document.getElementById('custom-searx-url').value.trim();
      localStorage.setItem('veroroute_searx_url', url);
      alert('URL do SearXNG configurada localmente! Para torná-la global, defina SEARXNG_URL no .dev.vars.');
    }
  </script>
</body>
</html>`;
}
