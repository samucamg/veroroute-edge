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
      padding: 0.75rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
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
      gap: 0.4rem;
      flex-wrap: wrap;
      align-items: center;
    }

    .nav-btn {
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      font-size: 0.85rem;
      font-weight: 500;
      padding: 0.45rem 0.85rem;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .nav-btn:hover {
      color: var(--text);
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);
    }

    .nav-btn.active {
      color: var(--primary);
      background: rgba(56, 189, 248, 0.12);
      border-color: rgba(56, 189, 248, 0.3);
      font-weight: 600;
    }

    .nav-btn.nav-admin {
      border-color: rgba(129, 140, 248, 0.4);
      background: rgba(129, 140, 248, 0.12);
      color: #c7d2fe;
    }

    .nav-btn.nav-admin:hover {
      background: rgba(129, 140, 248, 0.22);
      color: #fff;
    }

    /* Modal & Combo Styles */
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.78);
      backdrop-filter: blur(8px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1.5rem;
    }
    .modal-overlay.active { display: flex; animation: fadeIn 0.2s ease; }
    .modal-card {
      background: #101626;
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 1.75rem;
      max-width: 620px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
    }
    .combo-target-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      margin-bottom: 0.4rem;
      font-size: 0.85rem;
    }
    .badge-latency {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 9999px;
    }
    .badge-latency.ok {
      background: rgba(16, 185, 129, 0.15);
      color: var(--emerald);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .badge-latency.err {
      background: rgba(244, 63, 94, 0.15);
      color: var(--rose);
      border: 1px solid rgba(244, 63, 94, 0.3);
    }
    .toast-container {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      pointer-events: none;
    }
    .toast {
      background: #1e293b;
      color: #f8fafc;
      padding: 0.75rem 1.25rem;
      border-radius: 8px;
      border: 1px solid var(--card-border);
      font-size: 0.85rem;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.25s ease;
      pointer-events: auto;
      max-width: 400px;
    }
    .toast.active { opacity: 1; transform: translateY(0); }
    .toast-success { border-color: rgba(16, 185, 129, 0.5); background: #064e3b; color: #a7f3d0; }
    .toast-error { border-color: rgba(244, 63, 94, 0.5); background: #881337; color: #fecdd3; }
    .toast-info { border-color: rgba(56, 189, 248, 0.5); background: #0c4a6e; color: #bae6fd; }
    .model-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.25);
      color: var(--primary);
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      font-size: 0.78rem;
      font-family: monospace;
    }
    .model-tag .remove-btn {
      color: var(--rose);
      cursor: pointer;
      font-weight: bold;
      padding: 0 0.2rem;
      border-radius: 3px;
    }
    .model-tag .remove-btn:hover {
      background: rgba(244, 63, 94, 0.2);
    }
    .model-select-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.4rem 0.6rem;
      background: rgba(255,255,255,0.02);
      border: 1px solid var(--card-border);
      border-radius: 6px;
      font-size: 0.8rem;
    }
    .model-select-item:hover {
      background: rgba(255,255,255,0.05);
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


    /* M-6: Responsive layout for mobile/tablet */
    @media (max-width: 768px) {
      header { flex-direction: column; gap: 0.5rem; padding: 0.5rem 0.75rem; }
      .brand-text h1 { font-size: 0.95rem; }
      .brand-text .tagline { display: none; }
      nav { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
      nav .nav-btn { font-size: 0.7rem; padding: 0.35rem 0.55rem; white-space: nowrap; }
      .container { padding: 0.75rem; }
      .card { padding: 1rem; }
      .modal-content { width: 95vw; max-height: 90vh; }
    }
    @media (max-width: 480px) {
      .brand-icon { display: none; }
      nav .nav-btn { font-size: 0.65rem; padding: 0.3rem 0.4rem; }
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
      <button class="nav-btn nav-admin" onclick="showTab('admin')">⚙️ Administração</button>
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
        <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; margin-bottom: 1.25rem;">
          Conecte sua conta do Google para utilizar o Claude 3.7 Sonnet e Gemini 2.5 Pro através dos endpoints oficiais do Code Assist (usados nativamente pelo Antigravity CLI).
        </p>

        <!-- Status Card -->
        <div id="agy-status-card" style="padding: 1rem 1.25rem; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid var(--card-border); margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="font-size: 0.9rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
              <span>Status da Conexão:</span>
              <span id="agy-badge-configured" class="badge-edge" style="background: rgba(245,158,11,0.15); color: var(--amber); border-color: rgba(245,158,11,0.3);">Verificando...</span>
            </div>
            <div id="agy-detail-text" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.35rem;">
              Verificando credenciais no KV OMNI_KEYS e variáveis de ambiente...
            </div>
          </div>
          <div style="display: flex; gap: 0.75rem;">
            <a id="agy-auth-btn" href="/api/oauth/antigravity/authorize" class="btn" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
              🔗 Autorizar com Google
            </a>
            <button class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="loadAntigravityStatus()">
              🔄 Atualizar Status
            </button>
          </div>
        </div>

        <!-- Redirect URI Box -->
        <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 12px; padding: 1.1rem; margin-bottom: 1.5rem;">
          <div style="font-weight: 600; font-size: 0.88rem; color: var(--emerald); margin-bottom: 0.35rem;">
            🌐 Authorized Redirect URI do seu Worker (Necessário no Google Cloud)
          </div>
          <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;">
            <input type="text" id="agy-redirect-uri" readonly style="flex: 1; font-family: monospace; font-size: 0.8rem; background: rgba(0,0,0,0.3); color: #fff;" />
            <button class="btn btn-secondary" style="font-size: 0.8rem; padding: 0.45rem 0.85rem;" onclick="copyRedirectUri()">📋 Copiar URI</button>
          </div>
          <p style="color: var(--text-muted); font-size: 0.78rem; line-height: 1.4; margin: 0;">
            O Google OAuth exige que a URL do seu Worker esteja explicitamente registrada na lista de <em>URIs de redirecionamento autorizados</em> no Google Cloud Console. Por esse motivo de segurança do Google, cada implantação deve registrar a sua URL exclusiva.
          </p>
        </div>

        <!-- Passo a Passo Google Cloud Console Guide -->
        <details style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--card-border); border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem;">
          <summary style="cursor: pointer; font-weight: 600; font-size: 0.88rem; color: var(--primary);">
            📖 Como criar seu Google OAuth Client ID gratuito (Guia Passo a Passo)
          </summary>
          <div style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.6; margin-top: 0.75rem;">
            <ol style="padding-left: 1.25rem; margin-bottom: 0.5rem;">
              <li>Acesse o <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color: var(--primary); text-decoration: underline;">Google Cloud Console → Credenciais</a> com sua conta Google.</li>
              <li>Clique em <strong>+ Criar Credenciais</strong> e selecione <strong>ID do cliente OAuth</strong>.</li>
              <li>Se solicitado, configure a tela de consentimento como "Externo" (basta preencher o nome do app e seu e-mail).</li>
              <li>Em <em>Tipo de aplicativo</em>, escolha <strong>Aplicativo da Web</strong>.</li>
              <li>Em <strong>URIs de redirecionamento autorizados</strong>, clique em <em>+ Adicionar URI</em> e cole o <strong>Authorized Redirect URI</strong> copiado acima.</li>
              <li>Clique em <strong>Criar</strong>. O Google exibirá seu <strong>Client ID</strong> e <strong>Client Secret</strong>.</li>
              <li>Cole os dois valores no formulário abaixo e clique em <strong>Salvar Credenciais no KV</strong>.</li>
            </ol>
            <div style="background: rgba(245, 158, 11, 0.08); border-left: 3px solid var(--amber); padding: 0.5rem 0.75rem; border-radius: 4px; font-size: 0.78rem; margin-top: 0.5rem;">
              ⚡ <strong>Alternativa rápida sem criar nada no Google Cloud:</strong> Se você já tem o Antigravity CLI ou Gemini Code Assist logado no terminal, pule esta etapa e use a seção de <em>Importação Manual de Tokens</em> abaixo!
            </div>
          </div>
        </details>

        <!-- Credenciais OAuth Setup Form -->
        <div style="background: rgba(56, 189, 248, 0.03); border: 1px solid rgba(56, 189, 248, 0.15); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.75rem;">
          <h4 style="font-size: 0.95rem; margin-bottom: 0.5rem; color: var(--primary);">⚙️ Configuração das Credenciais do Google OAuth</h4>
          <p style="color: var(--text-muted); font-size: 0.82rem; line-height: 1.5; margin-bottom: 1rem;">
            🔒 <strong>Por que configurar aqui?</strong> Para evitar bloqueios do <strong>GitHub Secret Scanning</strong> ao commitar no repositório, suas credenciais de OAuth são salvas de forma segura no <strong>Cloudflare KV (<code>OMNI_KEYS</code>)</strong> ou via <code>wrangler secret put</code>.
          </p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
            <div>
              <label style="display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem;">Google OAuth Client ID:</label>
              <input type="text" id="agy-input-client-id" placeholder="ex: 123456789-abcdef.apps.googleusercontent.com" style="width: 100%; font-size: 0.85rem;" />
            </div>
            <div>
              <label style="display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem;">Google OAuth Client Secret:</label>
              <input type="password" id="agy-input-client-secret" placeholder="ex: GOCSPX-xxxxxxxxxxxx" style="width: 100%; font-size: 0.85rem;" />
            </div>
          </div>
          <button class="btn" style="padding: 0.5rem 1.25rem; font-size: 0.85rem;" onclick="saveAntigravityConfig()">
            💾 Salvar Credenciais no KV OMNI_KEYS
          </button>
        </div>

        <!-- Importação Manual de Tokens -->
        <div style="border-top: 1px solid var(--card-border); padding-top: 1.5rem;">
          <h4 style="font-size: 0.95rem; margin-bottom: 0.5rem;">📥 Importação Manual de Tokens (Sem Navegador)</h4>
          <p style="color: var(--text-muted); font-size: 0.82rem; margin-bottom: 0.75rem;">
            Se você já utiliza o Antigravity CLI localmente, pode colar diretamente o conteúdo de <code>~/.config/antigravity/tokens.json</code> ou seu <code>refresh_token</code>:
          </p>
          <textarea id="agy-token-input" rows="3" placeholder='{"access_token": "...", "refresh_token": "...", "project_id": "..."}' style="font-size: 0.85rem; font-family: monospace;"></textarea>
          <button class="btn btn-secondary" style="margin-top: 0.75rem; padding: 0.5rem 1.25rem; font-size: 0.85rem;" onclick="saveAgyToken()">
            Salvar Tokens no Worker
          </button>
        </div>
      </div>
    </div>

    <!-- TAB 5: COMBOS & QUOTA SHARING -->
    <div id="tab-combos" class="tab-pane">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
          <div>
            <div class="card-title" style="margin-bottom: 0.25rem;">⚡ Combos Inteligentes & Cascata de Failover</div>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0;">
              No VeroRoute Edge, <strong>o nome do combo é o modelo</strong>. Requisições para <code>{"model": "nome-do-combo"}</code> realizam failover automático entre os alvos.
            </p>
          </div>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button class="btn" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="openNewComboModal()">
              + Novo Combo
            </button>
            <button class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="testAllCombos()">
              ▶️ Testar Modelos
            </button>
            <button class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="loadCombos()">
              🔄 Atualizar
            </button>
          </div>
        </div>

        <!-- Quota Share Info Banner -->
        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--card-border); border-radius: 12px; padding: 0.9rem 1.2rem; margin-bottom: 1.5rem; font-size: 0.82rem; color: var(--text-muted); line-height: 1.5;">
          ⚖️ <strong>Work-Conserving Fair-Share:</strong> Combos distribuem a carga entre modelos e provedores. Se um provedor atinge limite de rate (HTTP 429) ou cota diária, o gateway salta para o próximo alvo da lista sem interrupção para o cliente.
        </div>

        <!-- Combos Grid -->
        <div id="combos-container" style="display: grid; grid-template-columns: 1fr; gap: 1.25rem;">
          <div style="text-align: center; padding: 2rem; color: var(--text-muted);">Carregando combos...</div>
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

        <h4 style="margin: 1.5rem 0 0.5rem 0; color: #38bdf8;">4. DeepSeek Harness (DSH) — Orquestrador de Agentes DeepSeek AI</h4>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.5rem;">
          O <strong>DeepSeek Harness (<code>dsh</code>)</strong> é o framework oficial e modular de orquestração de agentes autônomos da DeepSeek AI. Aponte o DSH diretamente para o seu VeroRoute Edge e utilize failover e combos como modelos de execução:
        </p>
        <div class="code-box">
# 1. Defina as variáveis de ambiente apontando para o VeroRoute Edge
export OPENAI_BASE_URL="https://seu-worker.workers.dev/v1"
export OPENAI_API_KEY="sk-vr-seu-token" # Sua chave virtual sk-vr-... ou AUTH_TOKEN
export DEEPSEEK_API_BASE="https://seu-worker.workers.dev/v1"

# 2. Inicie o DeepSeek Harness no modo Web ou CLI passando qualquer Combo como modelo:
npx @deepseek-ai/dsh web --model omni-code

# Ou invoque via CLI com seu combo customizado:
dsh --model combo-super-payload
        </div>
        <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 0.5rem;">
          💡 <strong>Dica de Combos:</strong> O nome de qualquer combo criado no VeroRoute Edge atua como o nome do modelo (<code>model: "combo-..."</code>).
        </p>
      </div>
    </div>

    <!-- TAB 8: ADMINISTRACAO -->
    <div id="tab-admin" class="tab-pane">
      <div class="card">
        <div class="card-title">🛠️ Painel de Administração de Provedores, Chaves e Modelos</div>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">
          Gerencie dinamicamente provedores, chaves de API para balanceamento e modelos. Todas as alterações são persistidas no Cloudflare KV.
        </p>

        <div style="margin-bottom: 1.5rem;">
          <button class="btn" onclick="loadAdmin()">🔄 Recarregar Painel</button>
          <span id="admin-status" style="color: var(--text-muted); font-size: 0.85rem; margin-left: 0.75rem;"></span>
        </div>

        <div class="provider-grid" id="admin-provider-grid">
          <!-- Renderizado via JS -->
        </div>
      </div>

      <div class="card">
        <div class="card-title">➕ Adicionar Novo Provedor (OpenAI / Anthropic Compatível)</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <div><label style="font-size:0.85rem; color: var(--text-muted);">Nome do Provedor:</label>
            <input type="text" id="acp-name" placeholder="Ex: Minha Empresa"></div>
          <div><label style="font-size:0.85rem; color: var(--text-muted);">Protocolo:</label>
            <select id="acp-protocol">
              <option value="openai">OpenAI Compatível</option>
              <option value="anthropic">Anthropic Compatível</option>
            </select></div>
          <div><label style="font-size:0.85rem; color: var(--text-muted);">Base URL:</label>
            <input type="text" id="acp-baseurl" placeholder="https://api.suaempresa.com/v1"></div>
          <div><label style="font-size:0.85rem; color: var(--text-muted);">Chave(s) API (vírgula p/ pool):</label>
            <input type="text" id="acp-keys" placeholder="sk-...,sk-..."></div>
          <div><label style="font-size:0.85rem; color: var(--text-muted);">Modelos (vírgula):</label>
            <input type="text" id="acp-models" placeholder="gpt-4o,claude-3-5-sonnet"></div>
          <div><label style="font-size:0.85rem; color: var(--text-muted);">Custo / 1M tokens (entrada):</label>
            <input type="number" id="acp-costin" placeholder="0" value="0"></div>
          <div style="display:flex; gap:1rem; align-items:center;">
            <label style="font-size:0.85rem; color: var(--text-muted);">Free Tier?</label><input type="checkbox" id="acp-freetier" checked>
            <label style="font-size:0.85rem; color: var(--text-muted);">Tool Calling?</label><input type="checkbox" id="acp-tools" checked>
            <label style="font-size:0.85rem; color: var(--text-muted);">Visão?</label><input type="checkbox" id="acp-vision">
          </div>
        <div style="display:flex; gap:0.75rem; margin-top:1.25rem;">
          <button class="btn" onclick="addCustomProvider()">+ Adicionar Provedor</button>
          <button class="btn btn-secondary" onclick="clearCustomProviderForm()">Limpar Formulário</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title">🔎 Buscar / Gerenciar Modelos</div>
        <div style="display:flex; gap:0.75rem; margin-bottom:1rem;">
          <input type="text" id="adm-model-search" placeholder="Buscar modelo ou provedor... ex: llama, gemini, gpt">
          <button class="btn btn-secondary" onclick="searchAdminModels()">Buscar</button>
        </div>
        <div id="adm-model-results" style="max-height:300px; overflow-y:auto;"></div>
      </div>

      <!-- TEMPLATES DE PROVEDORES FREE TIERS (RANKING ELO) -->
      <div class="card">
        <div class="card-title">⚡ Templates Rápidos: Top Provedores Gratuitos (Ranking ELO)</div>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">
          Clique em um template para preencher automaticamente as configurações com os melhores endpoints e modelos gratuitos disponíveis.
        </p>
        <div class="provider-grid" id="admin-presets-grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));">
          <!-- Renderizado via JS -->
        </div>
      </div>

      <!-- CONFIGURAÇÃO DE BUSCA WEB NO KV -->
      <div class="card">
        <div class="card-title">🌐 Configuração de Motores de Busca & RAG (Persistido no KV)</div>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1.25rem;">
          Configure os motores de busca para RAG serverless. Se deixar em branco, o sistema usará <strong>DuckDuckGo ($0 sem chave)</strong> automaticamente.
        </p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
          <div>
            <label style="font-size:0.85rem; color: var(--text-muted);">Motor de Busca Principal:</label>
            <select id="adm-search-engine">
              <option value="auto">Auto (Cascata Inteligente)</option>
              <option value="searxng">SearXNG (Self-Hosted / search.br5.com.br)</option>
              <option value="duckduckgo">DuckDuckGo ($0 Sem Cadastro)</option>
              <option value="serper">Google Serper (2.500 buscas grátis)</option>
              <option value="brave">Brave Search API (2.000 buscas/mês grátis)</option>
              <option value="tavily">Tavily AI Search (1.000 buscas/mês grátis)</option>
            </select>
          </div>
          <div>
            <label style="font-size:0.85rem; color: var(--text-muted);">SearXNG URL (Self-Hosted):</label>
            <input type="text" id="adm-search-searx" placeholder="Ex: https://search.br5.com.br">
          </div>
          <div>
            <label style="font-size:0.85rem; color: var(--text-muted);">Google Serper API Key:</label>
            <input type="password" id="adm-search-serper" placeholder="serper-api-key...">
          </div>
          <div>
            <label style="font-size:0.85rem; color: var(--text-muted);">Brave Search API Key:</label>
            <input type="password" id="adm-search-brave" placeholder="BSA...">
          </div>
          <div>
            <label style="font-size:0.85rem; color: var(--text-muted);">Tavily API Key:</label>
            <input type="password" id="adm-search-tavily" placeholder="tvly-...">
          </div>
        </div>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1rem;">
          <button class="btn" onclick="saveSearchConfig()">💾 Salvar Configurações de Busca no KV</button>
        </div>

        <div style="border-top: 1px solid var(--card-border); padding-top: 1rem; margin-top: 1rem;">
          <label style="font-size:0.85rem; color: var(--text-muted); font-weight:600;">Testar Busca em Tempo Real:</label>
          <div style="display:flex; gap:0.5rem; margin-top:0.4rem;">
            <input type="text" id="adm-search-test-query" placeholder="Digite uma consulta de teste... ex: últimas notícias de IA">
            <button class="btn btn-secondary" onclick="testSearch()">Testar</button>
          </div>
          <div id="adm-search-test-result" style="margin-top:0.75rem; font-size:0.8rem; max-height:200px; overflow-y:auto;"></div>
        </div>
      </div>

      <!-- CHAVES VIRTUAIS / API MANAGER -->
      <div class="card">
        <div class="card-title">🔑 Gerenciador de Chaves de Clientes (API Manager Light)</div>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">
          Crie chaves virtuais exclusivas (<code>sk-vr-...</code>) para amigos, equipes ou IDEs (Cursor, Cline, Claude Code). O uso é contabilizado de forma independente no KV.
        </p>
        <div style="display: flex; gap: 0.75rem; margin-bottom: 1.25rem;">
          <input type="text" id="adm-vkey-name" placeholder="Nome do cliente ou IDE (ex: Cursor Samuel)">
          <button class="btn" onclick="createVirtualKey()">+ Criar Chave Virtual</button>
        </div>
        <div id="adm-vkey-list" style="display: flex; flex-direction: column; gap: 0.5rem;">
          <!-- Renderizado via JS -->
        </div>
      </div>
    </div>
  </main>

  <!-- MODAL: NOVO / EDITAR COMBO -->
  <div id="modal-combo" class="modal-overlay">
    <div class="modal-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <h3 id="modal-combo-title" style="margin: 0; font-size: 1.2rem; color: #fff;">Novo Combo Inteligente</h3>
        <button type="button" class="btn btn-secondary" style="padding: 0.25rem 0.6rem; font-size: 0.85rem;" onclick="closeComboModal()">✕</button>
      </div>

      <div style="margin-bottom: 1rem;">
        <label style="display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem;">
          Nome do Combo / Identificador do Modelo: <span style="color: var(--rose);">*</span>
        </label>
        <input type="text" id="combo-form-id" placeholder="ex: combo-super-payload ou meu-combo-chat" style="width: 100%; font-family: monospace; font-size: 0.85rem;" />
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
          💡 Este identificador será o modelo requisitado na API: <code>{"model": "nome-do-combo"}</code>.
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
        <div>
          <label style="display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem;">Nome de Exibição:</label>
          <input type="text" id="combo-form-name" placeholder="ex: Super Payload" style="width: 100%; font-size: 0.85rem;" />
        </div>
        <div>
          <label style="display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem;">Estratégia de Roteamento:</label>
          <select id="combo-form-strategy" style="width: 100%; font-size: 0.85rem;">
            <option value="priority">Prioridade / Cascata Failover</option>
            <option value="round-robin">Round-Robin (Alternância)</option>
            <option value="p2c">P2C (Menor Latência)</option>
            <option value="lowest-cost">Menor Custo ($0 First)</option>
            <option value="random">Aleatório</option>
          </select>
        </div>
      </div>

      <div style="margin-bottom: 1rem;">
        <label style="display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.35rem;">Descrição:</label>
        <input type="text" id="combo-form-desc" placeholder="ex: Consumido para geração de atividades gamificadas" style="width: 100%; font-size: 0.85rem;" />
      </div>

      <div style="border-top: 1px solid var(--card-border); padding-top: 1rem; margin-bottom: 1rem;">
        <div style="font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem; color: #fff;">Modelos Alvo na Cascata:</div>
        <div id="modal-targets-list" style="max-height: 180px; overflow-y: auto; margin-bottom: 0.75rem;">
          <!-- Alvos listados aqui -->
        </div>

        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <select id="modal-add-provider" style="font-size: 0.8rem; width: 140px;">
            <option value="gemini">gemini</option>
            <option value="groq">groq</option>
            <option value="cerebras">cerebras</option>
            <option value="alibaba">alibaba</option>
            <option value="antigravity">antigravity</option>
            <option value="1min">1min</option>
            <option value="cloudflare-ai">cloudflare-ai</option>
            <option value="openrouter">openrouter</option>
            <option value="pollinations">pollinations</option>
            <option value="openai">openai</option>
            <option value="azure">azure</option>
            <option value="bedrock">bedrock</option>
          </select>
          <input type="text" id="modal-add-model" placeholder="Nome do modelo (ex: gemini-2.5-flash)" style="flex: 1; min-width: 180px; font-size: 0.8rem;" />
          <button type="button" class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="addModalTarget()">+ Adicionar Alvo</button>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--card-border); padding-top: 1rem;">
        <button type="button" class="btn btn-secondary" onclick="closeComboModal()">Cancelar</button>
        <button type="button" class="btn" onclick="saveComboForm()">💾 Salvar Combo</button>
      </div>
    </div>
  </div>

  <!-- MODAL: GERENCIAR CHAVES DO PROVEDOR -->
  <div id="modal-provider-keys" class="modal-overlay">
    <div class="modal-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <h3 id="mpk-title" style="margin: 0; font-size: 1.15rem; color: #fff;">🔑 Chaves de API do Provedor</h3>
        <button type="button" class="btn btn-secondary" style="padding: 0.25rem 0.6rem; font-size: 0.85rem;" onclick="closeProviderKeysModal()">✕</button>
      </div>

      <div id="mpk-status-box" style="padding: 0.75rem 1rem; background: rgba(255,255,255,0.03); border: 1px solid var(--card-border); border-radius: 8px; margin-bottom: 1rem; font-size: 0.85rem;">
        Carregando informações do pool...
      </div>

      <div style="margin-bottom: 1rem;">
        <label style="display: block; font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.35rem;">
          Adicionar Chave(s) ao Pool de Balanceamento:
        </label>
        <textarea id="mpk-new-key" rows="3" placeholder="Cole uma ou mais chaves (separe por vírgula ou uma por linha)" style="width: 100%; font-family: monospace; font-size: 0.82rem;"></textarea>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.3rem;">
          💡 O VeroRoute Edge rotaciona automaticamente entre todas as chaves adicionadas para evitar rate-limits (HTTP 429).
        </div>
      </div>

      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.25rem;">
        <button type="button" class="btn" onclick="saveProviderKeys()">+ Salvar Chave(s)</button>
        <button type="button" class="btn btn-secondary" style="color: var(--rose);" onclick="clearProviderKeys()">Limpar Pool de Chaves</button>
      </div>

      <div style="border-top: 1px solid var(--card-border); padding-top: 1rem; display: flex; justify-content: space-between; align-items: center;">
        <button type="button" class="btn btn-secondary" style="font-size: 0.8rem;" onclick="openProviderModelsModalFromKeys()">
          🤖 Configurar Modelos deste Provedor →
        </button>
        <button type="button" class="btn btn-secondary" onclick="closeProviderKeysModal()">Fechar</button>
      </div>
    </div>
  </div>

  <!-- MODAL: GERENCIAR MODELOS DO PROVEDOR -->
  <div id="modal-provider-models" class="modal-overlay">
    <div class="modal-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <h3 id="mpm-title" style="margin: 0; font-size: 1.15rem; color: #fff;">🤖 Modelos do Provedor</h3>
        <button type="button" class="btn btn-secondary" style="padding: 0.25rem 0.6rem; font-size: 0.85rem;" onclick="closeProviderModelsModal()">✕</button>
      </div>

      <!-- Modelos Atualmente Ativos -->
      <div style="margin-bottom: 1.25rem;">
        <label style="display: block; font-size: 0.82rem; font-weight: 600; color: #fff; margin-bottom: 0.5rem;">
          Modelos Ativos / Habilitados:
        </label>
        <div id="mpm-active-list" style="display: flex; flex-wrap: wrap; gap: 0.4rem; max-height: 120px; overflow-y: auto; padding: 0.5rem; background: rgba(255,255,255,0.02); border: 1px solid var(--card-border); border-radius: 8px;">
          <!-- Tags dos modelos ativos -->
        </div>
      </div>

      <!-- Descoberta Upstream & Catálogo -->
      <div style="background: rgba(56, 189, 248, 0.03); border: 1px solid rgba(56, 189, 248, 0.15); border-radius: 10px; padding: 1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <span style="font-weight: 600; font-size: 0.85rem; color: var(--primary);">
            🔍 Buscar Modelos Disponíveis (Upstream & Catálogo)
          </span>
          <button type="button" id="mpm-btn-fetch" class="btn btn-secondary" style="padding: 0.3rem 0.75rem; font-size: 0.78rem;" onclick="fetchAvailableModels()">
            Buscar Modelos
          </button>
        </div>
        <div id="mpm-fetch-status" style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem;">
          Clique em 'Buscar Modelos' para consultar a API oficial do provedor ou catálogo.
        </div>
        <div id="mpm-discovered-list" style="max-height: 160px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.6rem;">
          <!-- Modelos descobertos com checkboxes -->
        </div>
        <button type="button" id="mpm-btn-add-selected" class="btn" style="display: none; padding: 0.35rem 0.85rem; font-size: 0.8rem;" onclick="addSelectedDiscoveredModels()">
          + Adicionar Modelos Selecionados
        </button>
      </div>

      <!-- Inclusão Manual de Modelo -->
      <div style="border-top: 1px solid var(--card-border); padding-top: 1rem; margin-bottom: 1rem;">
        <label style="display: block; font-size: 0.82rem; font-weight: 600; color: #fff; margin-bottom: 0.4rem;">
          ✏️ Adicionar Modelo Manualmente:
        </label>
        <div style="display: flex; gap: 0.5rem;">
          <input type="text" id="mpm-manual-name" placeholder="Digite o nome do modelo (ex: llama-3.3-70b-versatile, qwen-max)" style="flex: 1; font-size: 0.82rem;" onkeydown="if(event.key==='Enter') addManualModel()" />
          <button type="button" class="btn btn-secondary" style="padding: 0.4rem 0.85rem; font-size: 0.82rem;" onclick="addManualModel()">
            + Adicionar
          </button>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; border-top: 1px solid var(--card-border); padding-top: 0.75rem;">
        <button type="button" class="btn btn-secondary" onclick="closeProviderModelsModal()">Fechar</button>
      </div>
    </div>
  </div>

  <!-- MODAL: ADICIONAR MODELO AO COMBO RAPIDAMENTE -->
  <div id="modal-quick-combo-model" class="modal-overlay">
    <div class="modal-card" style="max-width: 480px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <h3 id="mqc-title" style="margin: 0; font-size: 1.15rem; color: #fff;">Adicionar Modelo ao Combo</h3>
        <button type="button" class="btn btn-secondary" style="padding: 0.25rem 0.6rem; font-size: 0.85rem;" onclick="closeQuickComboModelModal()">✕</button>
      </div>

      <div style="margin-bottom: 1rem;">
        <label style="display: block; font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.35rem;">Selecione o Provedor:</label>
        <select id="mqc-provider" style="width: 100%; font-size: 0.85rem;" onchange="onQuickComboProviderChange()">
          <!-- Preenchido via JS -->
        </select>
      </div>

      <div style="margin-bottom: 1.25rem;">
        <label style="display: block; font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.35rem;">Nome do Modelo:</label>
        <input type="text" id="mqc-model" placeholder="ex: gemini-2.5-flash, llama-3.3-70b-versatile" style="width: 100%; font-size: 0.85rem;" list="mqc-model-suggestions" />
        <datalist id="mqc-model-suggestions"></datalist>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.5rem; border-top: 1px solid var(--card-border); padding-top: 1rem;">
        <button type="button" class="btn btn-secondary" onclick="closeQuickComboModelModal()">Cancelar</button>
        <button type="button" class="btn" onclick="saveQuickComboModel()">+ Adicionar ao Combo</button>
      </div>
    </div>
  </div>

  <script>
    function showTab(tabId) {
      document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
      const pane = document.getElementById('tab-' + tabId);
      if (pane) pane.classList.add('active');
      const btn = document.querySelector('.nav-btn[onclick*="' + tabId + '"]');
      if (btn) btn.classList.add('active');

      if (tabId === 'combos') loadCombos();
      else if (tabId === 'antigravity') loadAntigravityStatus();
      else if (tabId === 'admin') loadAdmin();
    }

    function showToast(msg, type) {
      type = type || 'info';
      let container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
      }
      const t = document.createElement('div');
      t.className = 'toast toast-' + type;
      t.innerText = msg;
      container.appendChild(t);
      setTimeout(function() { t.classList.add('active'); }, 10);
      setTimeout(function() {
        t.classList.remove('active');
        setTimeout(function() { t.remove(); }, 300);
      }, 4500);
    }

    function copyRedirectUri() {
      const uri = window.location.origin + '/api/oauth/antigravity/callback';
      navigator.clipboard.writeText(uri).then(function() {
        showToast('Authorized Redirect URI copiada para a área de transferência!', 'success');
      }).catch(function() {
        showToast('URL de redirecionamento: ' + uri, 'info');
      });
    }

    function getAdminToken() { return sessionStorage.getItem('vr_admin_token') || ''; }
    function setAdminToken(t) { if (t && t.trim()) sessionStorage.setItem('vr_admin_token', t.trim()); }
    function promptAdminToken(force) {
      var cur = getAdminToken();
      if (cur && !force) return cur;
      var t = prompt('VeroRoute Admin: insira o AUTH_TOKEN:');
      if (t && t.trim()) { setAdminToken(t); return t.trim(); }
      return cur;
    }
    function adminFetch(url, opts) {
      var token = getAdminToken();
      if (!token) { token = promptAdminToken(true); if (!token) return Promise.reject(new Error('Token admin nao fornecido.')); }
      opts = opts || {};
      opts.headers = Object.assign({ 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, opts.headers || {});
      return fetch(url, opts).then(function(res) {
        if (res.status === 401 || res.status === 503) { sessionStorage.removeItem('vr_admin_token'); alert('Token invalido ou servidor sem AUTH_TOKEN.'); }
        return res;
      });
    }
    function v1Fetch(url, opts) {
      opts = opts || {}; var tok = getAdminToken();
      if (tok) opts.headers = Object.assign({ 'Authorization': 'Bearer ' + tok }, opts.headers || {});
      return fetch(url, opts);
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
        const res = await v1Fetch('/v1/chat/completions', {
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
        let sseBuffer = '';
        botDiv.innerText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          const parts = sseBuffer.split('\\n');
          sseBuffer = parts.pop() || '';
          for (const line of parts) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const parsed = JSON.parse(line.slice(6));
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
        const res = await adminFetch('/api/oauth/antigravity/import', {
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

    // ============ ADMINISTRACAO ============
    async function loadAdmin() {
      const statusEl = document.getElementById('admin-status');
      if (statusEl) statusEl.innerText = 'Carregando...';
      try {
        const res = await adminFetch('/api/admin/config');
        if (!res.ok) {
          const err = await res.text();
          if (statusEl) statusEl.innerText = 'Erro: ' + err;
          return;
        }
        const data = await res.json();
        window._providersData = data.providers || [];
        renderAdminProviders(window._providersData);
        if (statusEl) statusEl.innerText = window._providersData.length + ' provedores carregados';
      } catch (e) {
        if (statusEl) statusEl.innerText = 'Erro: ' + e.message;
      }
      loadPresets();
      loadSearchConfig();
      loadVirtualKeys();
    }

    function renderAdminProviders(providers) {
      const grid = document.getElementById('admin-provider-grid');
      if (!grid) return;
      grid.innerHTML = '';
      providers.forEach(function(p) {
        const box = document.createElement('div');
        box.className = 'provider-box';
        const keyCount = p.keyCount !== undefined ? p.keyCount : (p.keys ? p.keys.length : 0);
        const modelCount = p.models ? p.models.length : 0;
        box.innerHTML =
          '<div class="provider-header">' +
            '<span class="provider-name">' + escapeHtml(p.name) + '</span>' +
            '<span class="status-dot" style="background:' + (p.enabled ? 'var(--emerald)' : 'var(--rose)') + ';box-shadow:0 0 8px ' + (p.enabled ? 'var(--emerald)' : 'var(--rose)') + '"></span>' +
          '</div>' +
          '<span style="font-size:0.78rem; color: var(--text-muted);">' + (p.isBuiltIn ? 'Embutido' : 'Customizado') + ' · ' + (p.protocol || 'openai') + '</span>' +
          '<span style="font-size:0.75rem; color: var(--primary); word-break:break-all;">Modelos (' + modelCount + '): ' + (p.models || []).slice(0, 3).join(', ') + (modelCount > 3 ? '...' : '') + '</span>' +
          '<span style="font-size:0.75rem; color: var(--text-muted);">Chaves no Pool: <strong>' + keyCount + '</strong></span>' +
          '<div style="display:flex; gap:0.4rem; flex-wrap:wrap; margin-top:0.5rem;">' +
            '<button class="btn btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.75rem;" onclick="toggleProvider(&apos;' + escapeHtml(p.id) + '&apos;,' + (p.enabled ? 'false' : 'true') + ')">' + (p.enabled ? 'Desativar' : 'Ativar') + '</button>' +
            '<button class="btn btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.75rem;" onclick="openProviderKeysModal(&apos;' + escapeHtml(p.id) + '&apos;)">🔑 Chaves (' + keyCount + ')</button>' +
            '<button class="btn btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.75rem;" onclick="openProviderModelsModal(&apos;' + escapeHtml(p.id) + '&apos;)">🤖 Modelos (' + modelCount + ')</button>' +
            (!p.isBuiltIn ? '<button class="btn btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.75rem; background:rgba(244,63,94,0.15); color:var(--rose);" onclick="deleteCustomProvider(&apos;' + escapeHtml(p.id) + '&apos;)">Excluir</button>' : '') +
          '</div>';
        grid.appendChild(box);
      });
    }

    async function toggleProvider(id, enabled) {
      try {
        const res = await adminFetch('/api/admin/providers/' + id + '/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: enabled })
        });
        const data = await res.json();
        loadAdmin();
        showToast(data.ok ? 'Provedor atualizado!' : 'Erro: ' + JSON.stringify(data.error || data), data.ok ? 'success' : 'error');
      } catch (e) { showToast('Erro: ' + e.message, 'error'); }
    }

    // Gerenciador de Chaves de API
    let activeModalProviderId = null;

    function openProviderKeysModal(providerId) {
      activeModalProviderId = providerId;
      const p = (window._providersData || []).find(function(x) { return x.id === providerId; });
      const provName = p ? p.name : providerId;
      document.getElementById('mpk-title').innerText = '🔑 Chaves de API: ' + provName;

      const count = p ? (p.keyCount !== undefined ? p.keyCount : (p.keys ? p.keys.length : 0)) : 0;
      const box = document.getElementById('mpk-status-box');
      box.innerHTML = '<strong>Provedor:</strong> ' + escapeHtml(provName) + ' (' + escapeHtml(p ? p.protocol || 'openai' : '') + ')<br>' +
        '<strong>Status do Pool:</strong> ' + (count > 0 ? '<span style="color:var(--emerald); font-weight:600;">' + count + ' chave(s) ativa(s) no balanceamento</span>' : '<span style="color:var(--amber);">Nenhuma chave cadastrada neste Worker</span>');

      document.getElementById('mpk-new-key').value = '';
      document.getElementById('modal-provider-keys').classList.add('active');
    }

    function closeProviderKeysModal() {
      document.getElementById('modal-provider-keys').classList.remove('active');
    }

    async function saveProviderKeys() {
      if (!activeModalProviderId) return;
      const val = document.getElementById('mpk-new-key').value.trim();
      if (!val) {
        showToast('Insira ao menos uma chave de API para salvar.', 'error');
        return;
      }
      const keys = val.split(/[\n,]+/).map(function(s) { return s.trim(); }).filter(Boolean);
      try {
        const res = await adminFetch('/api/admin/providers/' + activeModalProviderId + '/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keys: keys })
        });
        const data = await res.json();
        if (data.ok) {
          const poolCount = data.keyCount !== undefined ? data.keyCount : (data.keys ? data.keys.length : keys.length);
          showToast('Chave(s) salva(s) com sucesso! Pool atual: ' + poolCount + ' chaves.', 'success');
          document.getElementById('mpk-new-key').value = '';
          await loadAdmin();
          openProviderKeysModal(activeModalProviderId);
        } else {
          showToast('Erro ao salvar chaves: ' + JSON.stringify(data.error || data), 'error');
        }
      } catch (e) {
        showToast('Erro: ' + e.message, 'error');
      }
    }

    async function clearProviderKeys() {
      if (!activeModalProviderId) return;
      if (!confirm('Deseja realmente remover todas as chaves de API cadastradas para este provedor?')) return;
      try {
        const res = await adminFetch('/api/admin/providers/' + activeModalProviderId + '/keys', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keys: [] })
        });
        const data = await res.json();
        if (data.ok) {
          showToast('Pool de chaves limpo com sucesso!', 'info');
          await loadAdmin();
          openProviderKeysModal(activeModalProviderId);
        } else {
          showToast('Erro ao limpar chaves: ' + JSON.stringify(data.error || data), 'error');
        }
      } catch (e) {
        showToast('Erro: ' + e.message, 'error');
      }
    }

    function openProviderModelsModalFromKeys() {
      const pid = activeModalProviderId;
      closeProviderKeysModal();
      if (pid) openProviderModelsModal(pid);
    }

    // Gerenciador de Modelos
    function openProviderModelsModal(providerId) {
      activeModalProviderId = providerId;
      const p = (window._providersData || []).find(function(x) { return x.id === providerId; });
      const provName = p ? p.name : providerId;
      document.getElementById('mpm-title').innerText = '🤖 Modelos: ' + provName;

      renderActiveModelsList();

      document.getElementById('mpm-discovered-list').innerHTML = '';
      document.getElementById('mpm-btn-add-selected').style.display = 'none';
      document.getElementById('mpm-fetch-status').innerText = 'Clique em "Buscar Modelos" para consultar a API oficial do provedor ou catálogo.';
      document.getElementById('mpm-manual-name').value = '';

      document.getElementById('modal-provider-models').classList.add('active');
    }

    function closeProviderModelsModal() {
      document.getElementById('modal-provider-models').classList.remove('active');
    }

    function renderActiveModelsList() {
      const p = (window._providersData || []).find(function(x) { return x.id === activeModalProviderId; });
      const container = document.getElementById('mpm-active-list');
      if (!container) return;
      container.innerHTML = '';
      const models = (p && p.models) ? p.models : [];
      if (models.length === 0) {
        container.innerHTML = '<span style="color:var(--text-muted); font-size:0.8rem;">Nenhum modelo cadastrado. Adicione abaixo!</span>';
        return;
      }
      models.forEach(function(m) {
        const tag = document.createElement('span');
        tag.className = 'model-tag';
        tag.innerHTML = escapeHtml(m) + '<span class="remove-btn" title="Remover modelo" onclick="removeModelFromActiveProvider(&apos;' + escapeHtml(m) + '&apos;)">✕</span>';
        container.appendChild(tag);
      });
    }

    async function fetchAvailableModels() {
      if (!activeModalProviderId) return;
      const btn = document.getElementById('mpm-btn-fetch');
      const status = document.getElementById('mpm-fetch-status');
      const listContainer = document.getElementById('mpm-discovered-list');
      const addSelectedBtn = document.getElementById('mpm-btn-add-selected');

      btn.disabled = true;
      btn.innerText = 'Buscando...';
      status.innerText = 'Consultando API e catálogo de modelos...';
      listContainer.innerHTML = '';
      addSelectedBtn.style.display = 'none';

      try {
        const res = await adminFetch('/api/admin/providers/' + activeModalProviderId + '/fetch-models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const data = await res.json();
        btn.disabled = false;
        btn.innerText = 'Buscar Modelos';

        if (data.ok && data.models && data.models.length > 0) {
          const p = (window._providersData || []).find(function(x) { return x.id === activeModalProviderId; });
          const activeSet = new Set((p && p.models) ? p.models : []);

          status.innerHTML = (data.hasUpstream
            ? '<span style="color:var(--emerald); font-weight:600;">✓ ' + data.upstreamCount + ' modelos retornados pela API oficial do provedor!</span>'
            : '<span style="color:var(--amber);">Modelos do catálogo de referência (Upstream não respondeu ou sem chave).</span>');

          data.models.forEach(function(m) {
            const isAlreadyActive = activeSet.has(m);
            const item = document.createElement('div');
            item.className = 'model-select-item';
            item.innerHTML =
              '<div style="display:flex; align-items:center; gap:0.5rem;">' +
                '<input type="checkbox" class="disc-model-cb" value="' + escapeHtml(m) + '" ' + (isAlreadyActive ? 'checked disabled' : '') + ' style="cursor:pointer;" />' +
                '<span style="font-family:monospace; font-size:0.8rem;">' + escapeHtml(m) + '</span>' +
              '</div>' +
              (isAlreadyActive ? '<span style="font-size:0.72rem; color:var(--emerald); font-weight:600;">ativo</span>' : '<button class="btn btn-secondary" style="padding:0.2rem 0.5rem; font-size:0.7rem;" onclick="quickAddSingleModel(&apos;' + escapeHtml(m) + '&apos;)">+ Adicionar</button>');
            listContainer.appendChild(item);
          });

          addSelectedBtn.style.display = 'inline-block';
        } else {
          status.innerText = 'Nenhum modelo novo encontrado. ' + (data.fetchError ? 'Nota: ' + data.fetchError : '');
        }
      } catch (e) {
        btn.disabled = false;
        btn.innerText = 'Buscar Modelos';
        status.innerText = 'Erro ao buscar modelos: ' + e.message;
      }
    }

    async function quickAddSingleModel(modelName) {
      if (!activeModalProviderId || !modelName) return;
      try {
        const res = await adminFetch('/api/admin/providers/' + activeModalProviderId + '/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: modelName })
        });
        const data = await res.json();
        if (data.ok) {
          showToast('Modelo "' + modelName + '" adicionado com sucesso!', 'success');
          await loadAdmin();
          renderActiveModelsList();
          fetchAvailableModels();
        } else {
          showToast('Erro: ' + JSON.stringify(data.error || data), 'error');
        }
      } catch (e) {
        showToast('Erro: ' + e.message, 'error');
      }
    }

    async function addSelectedDiscoveredModels() {
      if (!activeModalProviderId) return;
      const checkboxes = document.querySelectorAll('.disc-model-cb:checked:not(:disabled)');
      const selected = [];
      checkboxes.forEach(function(cb) { selected.push(cb.value); });

      if (selected.length === 0) {
        showToast('Selecione ao menos um modelo novo para adicionar.', 'info');
        return;
      }

      try {
        const res = await adminFetch('/api/admin/providers/' + activeModalProviderId + '/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ models: selected })
        });
        const data = await res.json();
        if (data.ok) {
          showToast(selected.length + ' modelo(s) adicionado(s) com sucesso!', 'success');
          await loadAdmin();
          renderActiveModelsList();
          fetchAvailableModels();
        } else {
          showToast('Erro ao adicionar modelos: ' + JSON.stringify(data.error || data), 'error');
        }
      } catch (e) {
        showToast('Erro: ' + e.message, 'error');
      }
    }

    async function addManualModel() {
      if (!activeModalProviderId) return;
      const input = document.getElementById('mpm-manual-name');
      const name = input.value.trim();
      if (!name) {
        showToast('Digite o nome do modelo a adicionar.', 'error');
        return;
      }
      try {
        const res = await adminFetch('/api/admin/providers/' + activeModalProviderId + '/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: name })
        });
        const data = await res.json();
        if (data.ok) {
          showToast('Modelo "' + name + '" adicionado com sucesso!', 'success');
          input.value = '';
          await loadAdmin();
          renderActiveModelsList();
        } else {
          showToast('Erro: ' + JSON.stringify(data.error || data), 'error');
        }
      } catch (e) {
        showToast('Erro: ' + e.message, 'error');
      }
    }

    async function removeModelFromActiveProvider(modelName) {
      if (!activeModalProviderId || !modelName) return;
      if (!confirm('Remover o modelo "' + modelName + '" deste provedor?')) return;
      try {
        const res = await adminFetch('/api/admin/providers/' + activeModalProviderId + '/models', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: modelName })
        });
        const data = await res.json();
        if (data.ok) {
          showToast('Modelo removido com sucesso!', 'info');
          await loadAdmin();
          renderActiveModelsList();
        } else {
          showToast('Erro: ' + JSON.stringify(data.error || data), 'error');
        }
      } catch (e) {
        showToast('Erro: ' + e.message, 'error');
      }
    }

    async function deleteCustomProvider(id) {
      if (!confirm('Excluir o provedor customizado permanentemente?')) return;
      try {
        const res = await adminFetch('/api/admin/providers/' + id, { method: 'DELETE' });
        const data = await res.json();
        loadAdmin();
        showToast(data.ok ? 'Provedor excluído!' : 'Erro: ' + JSON.stringify(data.error || data), data.ok ? 'info' : 'error');
      } catch (e) { showToast('Erro: ' + e.message, 'error'); }
    }

    async function addCustomProvider() {
      const name = document.getElementById('acp-name').value.trim();
      const baseUrl = document.getElementById('acp-baseurl').value.trim();
      const protocol = document.getElementById('acp-protocol').value;
      const keysStr = document.getElementById('acp-keys').value.trim();
      const modelsStr = document.getElementById('acp-models').value.trim();
      const costIn = parseFloat(document.getElementById('acp-costin').value || '0');
      const freeTier = document.getElementById('acp-freetier').checked;
      const supportsTools = document.getElementById('acp-tools').checked;
      const supportsVision = document.getElementById('acp-vision').checked;

      if (!name || !baseUrl) {
        showToast('Preencha ao menos Nome e Base URL do provedor.', 'error');
        return;
      }

      const body = {
        name: name,
        baseUrl: baseUrl,
        protocol: protocol,
        apiKeys: keysStr ? keysStr.split(/[\n,]+/).map(function(s){return s.trim();}).filter(Boolean) : [],
        models: modelsStr ? modelsStr.split(/[\n,]+/).map(function(s){return s.trim();}).filter(Boolean) : [],
        costPerMillionInput: costIn,
        freeTier: freeTier,
        supportsStreaming: true,
        supportsTools: supportsTools,
        supportsVision: supportsVision
      };

      try {
        const res = await adminFetch('/api/admin/providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        if (data.ok) {
          showToast('Provedor "' + name + '" adicionado com sucesso!', 'success');
          document.getElementById('acp-name').value = '';
          document.getElementById('acp-baseurl').value = '';
          document.getElementById('acp-keys').value = '';
          document.getElementById('acp-models').value = '';
          loadAdmin();
        } else {
          showToast('Erro ao adicionar provedor: ' + JSON.stringify(data.error || data), 'error');
        }
      } catch (e) { showToast('Erro: ' + e.message, 'error'); }
    }

    function clearCustomProviderForm() {
      document.getElementById('acp-name').value = '';
      document.getElementById('acp-baseurl').value = '';
      document.getElementById('acp-keys').value = '';
      document.getElementById('acp-models').value = '';
      showToast('Formulário limpo.', 'info');
    }

    async function searchAdminModels() {
      const q = document.getElementById('adm-model-search').value.trim();
      const target = document.getElementById('adm-model-results');
      try {
        const res = await adminFetch('/api/admin/models?q=' + encodeURIComponent(q));
        const data = await res.json();
        let html = '';
        (data.models || []).forEach(function(m) {
          html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem; border-bottom:1px solid var(--card-border);">' +
            '<span style="font-size:0.85rem;">' + escapeHtml(m.provider) + ' / <strong>' + escapeHtml(m.id) + '</strong></span>' +
            '<span>' + (m.enabled ? '<span style="color:var(--emerald); font-size:0.75rem;">ativo</span>' : '<span style="color:var(--rose); font-size:0.75rem;">excluído</span>') + '</span>' +
          '</div>';
        });
        target.innerHTML = html || 'Nenhum modelo encontrado.';
      } catch (e) {
        target.innerHTML = 'Erro: ' + e.message;
      }
    }

    async function loadPresets() {
      const grid = document.getElementById('admin-presets-grid');
      if (!grid) return;
      try {
        const res = await adminFetch('/api/admin/presets');
        const data = await res.json();
        grid.innerHTML = '';
        (data.presets || []).forEach(function(p) {
          const box = document.createElement('div');
          box.className = 'provider-box';
          box.innerHTML =
            '<div class="provider-header">' +
              '<span class="provider-name">' + escapeHtml(p.name) + '</span>' +
              '<span class="badge-edge">ELO #' + p.eloRank + '</span>' +
            '</div>' +
            '<span style="font-size:0.75rem; color:var(--text-muted);">' + escapeHtml(p.description) + '</span>' +
            '<span style="font-size:0.75rem; color:var(--emerald);">' + escapeHtml(p.freeTierNotes) + '</span>' +
            '<span style="font-size:0.72rem; color:var(--primary); word-break:break-all;">Modelos: ' + escapeHtml((p.recommendedModels || []).slice(0, 2).join(', ')) + '</span>' +
            '<button class="btn btn-secondary" style="margin-top:0.5rem; padding:0.35rem 0.6rem; font-size:0.75rem;" onclick="applyPreset(&apos;' + escapeHtml(p.id) + '&apos;)">⚡ Usar Template</button>';
          grid.appendChild(box);
        });
        window._presetsData = data.presets || [];
      } catch (e) {
        grid.innerHTML = '<span style="color:var(--rose);">Erro ao carregar templates: ' + e.message + '</span>';
      }
    }

    function applyPreset(presetId) {
      const p = (window._presetsData || []).find(function(x) { return x.id === presetId; });
      if (!p) return;
      document.getElementById('acp-name').value = p.name;
      document.getElementById('acp-protocol').value = p.protocol;
      document.getElementById('acp-baseurl').value = p.baseUrl;
      document.getElementById('acp-models').value = (p.recommendedModels || []).join(',');
      document.getElementById('acp-freetier').checked = true;
      document.getElementById('acp-keys').value = ''; // FIX: limpar chave antiga para não reaproveitar
      document.getElementById('acp-name').scrollIntoView({ behavior: 'smooth' });
      document.getElementById('acp-keys').focus();
      showToast('Template "' + p.name + '" aplicado! Insira a sua chave de API.', 'info');
    }

    async function loadSearchConfig() {
      try {
        const res = await adminFetch('/api/admin/search');
        const data = await res.json();
        if (data.ok && data.searchConfig) {
          const cfg = data.searchConfig;
          if (cfg.engine) document.getElementById('adm-search-engine').value = cfg.engine;
          if (cfg.searxngUrl) document.getElementById('adm-search-searx').value = cfg.searxngUrl;
          if (cfg.serperApiKey) document.getElementById('adm-search-serper').value = cfg.serperApiKey;
          if (cfg.braveApiKey) document.getElementById('adm-search-brave').value = cfg.braveApiKey;
          if (cfg.tavilyApiKey) document.getElementById('adm-search-tavily').value = cfg.tavilyApiKey;
        }
      } catch (e) {
        console.error('Erro ao carregar config de busca', e);
      }
    }

    async function saveSearchConfig() {
      const engine = document.getElementById('adm-search-engine').value;
      const searxngUrl = document.getElementById('adm-search-searx').value.trim();
      const serperApiKey = document.getElementById('adm-search-serper').value.trim();
      const braveApiKey = document.getElementById('adm-search-brave').value.trim();
      const tavilyApiKey = document.getElementById('adm-search-tavily').value.trim();

      try {
        const res = await adminFetch('/api/admin/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ engine, searxngUrl, serperApiKey, braveApiKey, tavilyApiKey })
        });
        const data = await res.json();
        if (data.ok) {
          alert('Configurações de busca salvas com sucesso no KV!');
        } else {
          alert('Erro ao salvar: ' + JSON.stringify(data));
        }
      } catch (e) {
        alert('Erro: ' + e.message);
      }
    }

    async function testSearch() {
      const q = document.getElementById('adm-search-test-query').value.trim();
      const resEl = document.getElementById('adm-search-test-result');
      if (!q) return alert('Digite uma consulta para testar');
      resEl.innerHTML = 'Buscando nos motores configurados...';
      try {
        const res = await adminFetch('/api/admin/search/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q })
        });
        const data = await res.json();
        if (!data.ok) {
          resEl.innerHTML = '<span style="color:var(--rose);">Erro: ' + escapeHtml(data.error || 'Falha na busca') + '</span>';
          return;
        }
        let html = '<div style="color:var(--emerald); font-weight:600; margin-bottom:0.4rem;">Motor: ' + escapeHtml(data.engine) + ' (' + (data.results || []).length + ' resultados)</div>';
        (data.results || []).forEach(function(r) {
          html += '<div style="margin-bottom:0.5rem; padding:0.4rem; background:rgba(255,255,255,0.03); border-radius:6px;">' +
            '<a href="' + escapeHtml(r.url) + '" target="_blank" style="color:var(--primary); font-weight:600; text-decoration:none;">' + escapeHtml(r.title) + '</a>' +
            '<p style="margin:0.2rem 0 0 0; font-size:0.75rem; color:var(--text-muted);">' + escapeHtml(r.snippet) + '</p>' +
          '</div>';
        });
        resEl.innerHTML = html || 'Nenhum resultado retornado.';
      } catch (e) {
        resEl.innerHTML = '<span style="color:var(--rose);">Erro: ' + escapeHtml(e.message) + '</span>';
      }
    }

    async function loadVirtualKeys() {
      const list = document.getElementById('adm-vkey-list');
      if (!list) return;
      try {
        const res = await adminFetch('/api/admin/virtual-keys');
        const data = await res.json();
        list.innerHTML = '';
        if (!data.keys || data.keys.length === 0) {
          list.innerHTML = '<span style="color:var(--text-muted); font-size:0.85rem;">Nenhuma chave virtual criada ainda. Chaves criadas aqui funcionam como Bearer token em clientes Cursor, Cline e Claude Code.</span>';
          return;
        }
        data.keys.forEach(function(k) {
          const item = document.createElement('div');
          item.style = 'display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0.8rem; background:rgba(255,255,255,0.03); border:1px solid var(--card-border); border-radius:8px;';
          item.innerHTML =
            '<div>' +
              '<div style="font-weight:600; font-size:0.85rem;">' + escapeHtml(k.name) + ' <span style="font-family:monospace; color:var(--primary); font-size:0.8rem; margin-left:0.5rem;">' + escapeHtml(k.key) + '</span></div>' +
              '<div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">Requisições: <strong>' + (k.requestsCount || 0) + '</strong> · Criada em: ' + escapeHtml(k.createdAt ? k.createdAt.substring(0, 10) : '') + '</div>' +
            '</div>' +
            '<button class="btn btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.75rem; background:rgba(244,63,94,0.15); color:var(--rose);" onclick="deleteVirtualKey(&apos;' + escapeHtml(k.id) + '&apos;)">Revogar</button>';
          list.appendChild(item);
        });
      } catch (e) {
        list.innerHTML = '<span style="color:var(--rose);">Erro ao carregar chaves: ' + e.message + '</span>';
      }
    }

    async function createVirtualKey() {
      const name = document.getElementById('adm-vkey-name').value.trim();
      if (!name) return alert('Informe o nome do cliente ou IDE');
      try {
        const res = await adminFetch('/api/admin/virtual-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name })
        });
        const data = await res.json();
        if (data.ok && data.key) {
          document.getElementById('adm-vkey-name').value = '';
          loadVirtualKeys();
          alert('Chave virtual criada com sucesso!\\n\\nChave: ' + data.key.key + '\\n\\nCopie e configure no seu Cursor/Cline/Claude Code.');
        } else {
          alert('Erro ao criar chave: ' + JSON.stringify(data));
        }
      } catch (e) {
        alert('Erro: ' + e.message);
      }
    }

    async function deleteVirtualKey(id) {
      if (!confirm('Revogar esta chave virtual permanentemente? Clientes que a utilizam perderão o acesso.')) return;
      try {
        const res = await adminFetch('/api/admin/virtual-keys/' + id, { method: 'DELETE' });
        const data = await res.json();
        if (data.ok) {
          loadVirtualKeys();
        } else {
          alert('Erro ao revogar chave: ' + JSON.stringify(data));
        }
      } catch (e) {
        alert('Erro: ' + e.message);
      }
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }

    // ============ ANTIGRAVITY OAUTH & KV CONFIG ============
    async function loadAntigravityStatus() {
      const badge = document.getElementById('agy-badge-configured');
      const detail = document.getElementById('agy-detail-text');
      const authBtn = document.getElementById('agy-auth-btn');
      const redirectInput = document.getElementById('agy-redirect-uri');
      if (redirectInput) {
        redirectInput.value = window.location.origin + '/api/oauth/antigravity/callback';
      }
      if (!badge) return;
      try {
        const res = await adminFetch('/api/admin/antigravity/status');
        const data = await res.json();
        if (data.isConfigured) {
          badge.innerText = 'Pronto para Uso';
          badge.style.background = 'rgba(16,185,129,0.15)';
          badge.style.color = 'var(--emerald)';
          badge.style.borderColor = 'rgba(16,185,129,0.3)';
          detail.innerHTML = 'Client ID configurado (' + escapeHtml(data.maskedClientId) + ')' +
            (data.hasTokens ? ' · <strong style="color:var(--emerald);">Tokens Ativos no KV</strong>' : ' · <span style="color:var(--amber);">Aguardando Autorização</span>');
          if (authBtn) authBtn.style.opacity = '1';
        } else {
          badge.innerText = 'Credenciais Pendentes';
          badge.style.background = 'rgba(245,158,11,0.15)';
          badge.style.color = 'var(--amber)';
          badge.style.borderColor = 'rgba(245,158,11,0.3)';
          detail.innerHTML = 'Insira o Client ID e Client Secret abaixo para salvar com segurança no KV OMNI_KEYS.';
        }
      } catch (e) {
        if (badge) badge.innerText = 'Erro ao verificar';
      }
    }

    async function saveAntigravityConfig() {
      const clientId = document.getElementById('agy-input-client-id').value.trim();
      const clientSecret = document.getElementById('agy-input-client-secret').value.trim();
      if (!clientId || !clientSecret) return showToast('Por favor, informe tanto o Client ID quanto o Client Secret.', 'error');

      try {
        const res = await adminFetch('/api/admin/antigravity/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: clientId, clientSecret: clientSecret })
        });
        const data = await res.json();
        if (data.ok) {
          showToast('Credenciais salvas com sucesso no KV OMNI_KEYS!', 'success');
          document.getElementById('agy-input-client-secret').value = '';
          loadAntigravityStatus();
        } else {
          showToast('Erro ao salvar: ' + (data.error ? data.error.message : 'Desconhecido'), 'error');
        }
      } catch (e) {
        showToast('Erro: ' + e.message, 'error');
      }
    }

    // ============ COMBOS & QUOTAS ============
    let currentCombos = {};
    let modalTargets = [];

    async function loadCombos() {
      const container = document.getElementById('combos-container');
      if (!container) return;
      try {
        const res = await adminFetch('/api/admin/combos');
        const data = await res.json();
        currentCombos = {};
        (data.combos || []).forEach(function(c) { currentCombos[c.id] = c; });
        renderCombos(data.combos || []);
      } catch (e) {
        container.innerHTML = '<div style="color:var(--rose);">Erro ao carregar combos: ' + escapeHtml(e.message) + '</div>';
      }
    }

    function renderCombos(combos) {
      const container = document.getElementById('combos-container');
      if (!container) return;
      if (!combos || combos.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-muted);">Nenhum combo cadastrado. Clique em "+ Novo Combo" para criar.</div>';
        return;
      }

      const strategyLabels = {
        'priority': 'PRIORIDADE / FAILOVER',
        'round-robin': 'ROUND-ROBIN',
        'p2c': 'P2C LOAD-BALANCE',
        'lowest-cost': 'MENOR CUSTO ($0 FIRST)',
        'random': 'ALEATÓRIO'
      };

      let html = '';
      combos.forEach(function(c) {
        const stratLabel = strategyLabels[c.strategy] || (c.strategy || 'PRIORIDADE').toUpperCase();
        html += '<div class="card" style="margin-bottom:0.75rem; background:rgba(18,24,38,0.85); border:1px solid var(--card-border);">' +
          '<div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:0.75rem; margin-bottom:0.75rem;">' +
            '<div>' +
              '<div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap;">' +
                '<span style="font-size:1.1rem; font-weight:700; color:#fff;">' + escapeHtml(c.name || c.id) + '</span>' +
                '<span class="badge-edge" style="font-family:monospace; background:rgba(56,189,248,0.15); color:var(--primary); cursor:pointer;" title="Clique para copiar" data-copy="' + escapeHtml(c.id) + '" onclick="navigator.clipboard.writeText(this.dataset.copy); alert(this.dataset.copy + String.fromCharCode(32,99,111,112,105,97,100,111));">' +
                  'model: ' + escapeHtml(c.id) + ' 📋' +
                '</span>' +
                '<span class="badge-edge" style="background:rgba(129,140,248,0.15); color:var(--accent); border-color:rgba(129,140,248,0.3);">' +
                  escapeHtml(stratLabel) +
                '</span>' +
              '</div>' +
              (c.description ? '<p style="color:var(--text-muted); font-size:0.82rem; margin-top:0.35rem; line-height:1.4;">' + escapeHtml(c.description) + '</p>' : '') +
            '</div>' +
            '<div style="display:flex; gap:0.4rem; flex-wrap:wrap;">' +
              '<button class="btn btn-secondary" style="padding:0.35rem 0.75rem; font-size:0.78rem;" data-combo-id="' + escapeHtml(c.id) + '" onclick="testCombo(this.dataset.comboId)">▶️ Testar Modelos</button>' +
              '<button class="btn btn-secondary" style="padding:0.35rem 0.75rem; font-size:0.78rem;" data-combo-id="' + escapeHtml(c.id) + '" onclick="openQuickAddModelModal(this.dataset.comboId)">+ Modelo</button>' +
              '<button class="btn btn-secondary" style="padding:0.35rem 0.75rem; font-size:0.78rem;" data-combo-id="' + escapeHtml(c.id) + '" onclick="openEditComboModal(this.dataset.comboId)">✏️ Editar</button>' +
              '<button class="btn btn-secondary" style="padding:0.35rem 0.75rem; font-size:0.78rem; background:rgba(244,63,94,0.15); color:var(--rose);" data-combo-id="' + escapeHtml(c.id) + '" onclick="deleteCombo(this.dataset.comboId)">🗑️</button>' +
            '</div>' +
          '</div>' +

          '<div style="margin-top:0.75rem;">' +
            '<div style="font-size:0.78rem; font-weight:600; color:var(--text-muted); margin-bottom:0.4rem;">MODELOS ALVO NA CASCATA (' + (c.targets ? c.targets.length : 0) + '):</div>' +
            '<div style="display:flex; flex-wrap:wrap; gap:0.5rem;" id="combo-targets-' + escapeHtml(c.id) + '">';

        if (c.targets && c.targets.length > 0) {
          c.targets.forEach(function(t, idx) {
            html += '<div style="display:inline-flex; align-items:center; gap:0.4rem; background:rgba(255,255,255,0.04); border:1px solid var(--card-border); border-radius:8px; padding:0.3rem 0.6rem; font-size:0.8rem;">' +
              '<span style="color:var(--text-muted); font-size:0.7rem;">#' + (idx + 1) + '</span>' +
              '<strong style="color:var(--primary); font-size:0.75rem;">' + escapeHtml(t.provider) + '</strong>' +
              '<span style="font-family:monospace;">' + escapeHtml(t.model) + '</span>' +
              '<span id="test-badge-' + escapeHtml(c.id) + '-' + idx + '" style="margin-left:0.2rem;"></span>' +
              '<span style="color:var(--text-muted); cursor:pointer; font-size:0.9rem; padding:0 2px;" title="Remover alvo" data-combo-id="' + escapeHtml(c.id) + '" data-provider="' + escapeHtml(t.provider) + '" data-model="' + escapeHtml(t.model) + '" onclick="removeModelFromCombo(this.dataset.comboId, this.dataset.provider, this.dataset.model)">✕</span>' +
            '</div>';
          });
        } else {
          html += '<span style="color:var(--text-muted); font-size:0.8rem;">Nenhum modelo alvo vinculado. Clique em "+ Modelo".</span>';
        }

        html += '</div></div></div>';
      });

      container.innerHTML = html;
    }

    function openNewComboModal() {
      document.getElementById('modal-combo-title').innerText = 'Novo Combo Inteligente';
      document.getElementById('combo-form-id').value = '';
      document.getElementById('combo-form-id').disabled = false;
      document.getElementById('combo-form-name').value = '';
      document.getElementById('combo-form-desc').value = '';
      document.getElementById('combo-form-strategy').value = 'priority';
      modalTargets = [];
      renderModalTargets();
      document.getElementById('modal-combo').classList.add('active');
    }

    function openEditComboModal(id) {
      const c = currentCombos[id];
      if (!c) return;
      document.getElementById('modal-combo-title').innerText = 'Editar Combo: ' + c.id;
      document.getElementById('combo-form-id').value = c.id;
      document.getElementById('combo-form-id').disabled = true;
      document.getElementById('combo-form-name').value = c.name || c.id;
      document.getElementById('combo-form-desc').value = c.description || '';
      document.getElementById('combo-form-strategy').value = c.strategy || 'priority';
      modalTargets = (c.targets || []).map(function(t) { return { provider: t.provider, model: t.model }; });
      renderModalTargets();
      document.getElementById('modal-combo').classList.add('active');
    }

    function closeComboModal() {
      document.getElementById('modal-combo').classList.remove('active');
    }

    function renderModalTargets() {
      const container = document.getElementById('modal-targets-list');
      if (!container) return;
      if (modalTargets.length === 0) {
        container.innerHTML = '<span style="color:var(--text-muted); font-size:0.8rem;">Nenhum modelo adicionado ainda. Selecione e adicione abaixo.</span>';
        return;
      }
      let html = '';
      modalTargets.forEach(function(t, i) {
        html += '<div class="combo-target-item">' +
          '<span><strong style="color:var(--primary);">' + escapeHtml(t.provider) + '</strong> / <span style="font-family:monospace;">' + escapeHtml(t.model) + '</span></span>' +
          '<button type="button" class="btn btn-secondary" style="padding:0.2rem 0.5rem; font-size:0.75rem; color:var(--rose);" onclick="removeModalTarget(' + i + ')">Remover</button>' +
        '</div>';
      });
      container.innerHTML = html;
    }

    function addModalTarget() {
      const prov = document.getElementById('modal-add-provider').value.trim();
      const mod = document.getElementById('modal-add-model').value.trim();
      if (!prov || !mod) return alert('Selecione o provedor e informe o modelo');
      modalTargets.push({ provider: prov, model: mod });
      document.getElementById('modal-add-model').value = '';
      renderModalTargets();
    }

    function removeModalTarget(idx) {
      modalTargets.splice(idx, 1);
      renderModalTargets();
    }

    async function saveComboForm() {
      const id = document.getElementById('combo-form-id').value.trim();
      const name = document.getElementById('combo-form-name').value.trim();
      const description = document.getElementById('combo-form-desc').value.trim();
      const strategy = document.getElementById('combo-form-strategy').value;

      if (!id) return alert('O identificador/nome do combo é obrigatório.');

      try {
        const res = await adminFetch('/api/admin/combos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: id,
            name: name || id,
            description: description,
            strategy: strategy,
            targets: modalTargets,
            enabled: true
          })
        });
        const data = await res.json();
        if (data.ok) {
          closeComboModal();
          loadCombos();
        } else {
          alert('Erro ao salvar combo: ' + JSON.stringify(data));
        }
      } catch (e) {
        alert('Erro: ' + e.message);
      }
    }

    async function deleteCombo(id) {
      if (!confirm('Deseja excluir o combo "' + id + '"? Clientes com esse modelo deixarão de funcionar.')) return;
      try {
        const res = await adminFetch('/api/admin/combos/' + id, { method: 'DELETE' });
        const data = await res.json();
        if (data.ok) loadCombos();
        else alert('Erro ao excluir: ' + JSON.stringify(data));
      } catch (e) {
        alert('Erro: ' + e.message);
      }
    }

    let activeQuickComboId = null;

    function openQuickAddModelModal(comboId) {
      activeQuickComboId = comboId;
      document.getElementById('mqc-title').innerText = 'Adicionar Modelo ao Combo: ' + comboId;
      const select = document.getElementById('mqc-provider');
      select.innerHTML = '';

      const providers = window._providersData || [];
      const defaultList = ['gemini', 'groq', 'cerebras', 'alibaba', 'antigravity', '1min', 'cloudflare-ai', 'openrouter', 'pollinations', 'openai', 'azure', 'bedrock'];
      const allPids = Array.from(new Set([...defaultList, ...providers.map(function(p) { return p.id; })]));

      allPids.forEach(function(pid) {
        const opt = document.createElement('option');
        opt.value = pid;
        const p = providers.find(function(x) { return x.id === pid; });
        opt.innerText = p ? p.name : pid;
        select.appendChild(opt);
      });

      onQuickComboProviderChange();
      document.getElementById('modal-quick-combo-model').classList.add('active');
    }

    function closeQuickComboModelModal() {
      document.getElementById('modal-quick-combo-model').classList.remove('active');
    }

    function onQuickComboProviderChange() {
      const pid = document.getElementById('mqc-provider').value;
      const dl = document.getElementById('mqc-model-suggestions');
      dl.innerHTML = '';
      const p = (window._providersData || []).find(function(x) { return x.id === pid; });
      if (p && p.models) {
        p.models.forEach(function(m) {
          const opt = document.createElement('option');
          opt.value = m;
          dl.appendChild(opt);
        });
        if (p.models.length > 0) {
          document.getElementById('mqc-model').value = p.models[0];
        } else {
          document.getElementById('mqc-model').value = '';
        }
      } else {
        document.getElementById('mqc-model').value = '';
      }
    }

    async function saveQuickComboModel() {
      if (!activeQuickComboId) return;
      const prov = document.getElementById('mqc-provider').value.trim();
      const mod = document.getElementById('mqc-model').value.trim();
      if (!prov || !mod) {
        showToast('Selecione o provedor e informe o modelo.', 'error');
        return;
      }
      try {
        const res = await adminFetch('/api/admin/combos/' + activeQuickComboId + '/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: prov, model: mod })
        });
        const data = await res.json();
        if (data.ok) {
          showToast('Modelo ' + prov + '/' + mod + ' adicionado ao combo!', 'success');
          closeQuickComboModelModal();
          loadCombos();
        } else {
          showToast('Erro: ' + JSON.stringify(data.error || data), 'error');
        }
      } catch (e) {
        showToast('Erro: ' + e.message, 'error');
      }
    }

    async function removeModelFromCombo(comboId, provider, model) {
      if (!confirm('Remover ' + provider + '/' + model + ' deste combo?')) return;
      try {
        const res = await adminFetch('/api/admin/combos/' + comboId + '/models', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: provider, model: model })
        });
        const data = await res.json();
        if (data.ok) loadCombos();
        else alert('Erro: ' + JSON.stringify(data));
      } catch (e) {
        alert('Erro: ' + e.message);
      }
    }

    async function testCombo(comboId) {
      const c = currentCombos[comboId];
      if (!c || !c.targets || c.targets.length === 0) return alert('Este combo não possui modelos para testar.');

      c.targets.forEach(function(_, idx) {
        const badge = document.getElementById('test-badge-' + comboId + '-' + idx);
        if (badge) {
          badge.className = 'badge-latency';
          badge.style.background = 'rgba(56,189,248,0.15)';
          badge.style.color = 'var(--primary)';
          badge.innerText = 'Testando...';
        }
      });

      try {
        const res = await adminFetch('/api/admin/combos/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comboId: comboId })
        });
        const data = await res.json();
        if (data.ok && data.results) {
          data.results.forEach(function(r, idx) {
            const badge = document.getElementById('test-badge-' + comboId + '-' + idx);
            if (badge) {
              if (r.success) {
                badge.className = 'badge-latency ok';
                badge.innerText = '⚡ ' + r.latency_ms + 'ms · OK';
              } else {
                badge.className = 'badge-latency err';
                badge.innerText = '❌ ' + (r.status || 'Erro') + (r.latency_ms ? ' (' + r.latency_ms + 'ms)' : '');
                badge.title = r.error || 'Falha no teste';
              }
            }
          });
        }
      } catch (e) {
        alert('Erro ao executar testes: ' + e.message);
      }
    }

    async function testAllCombos() {
      const comboIds = Object.keys(currentCombos);
      if (comboIds.length === 0) return alert('Nenhum combo para testar.');
      for (let i = 0; i < comboIds.length; i++) {
        await testCombo(comboIds[i]);
      }
    }

    // Inicialização
    const urlParams = new URLSearchParams(window.location.search);
    const initialTab = urlParams.get('tab') || window.location.hash.replace('#tab-', '') || 'overview';
    if (initialTab && initialTab !== 'overview') {
      showTab(initialTab);
    } else {
      loadCombos();
    }
    loadAdmin();
  </script>
</body>
</html>`;
}
