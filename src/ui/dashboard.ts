/**
 * Dashboard Visual do VeroRoute Edge (SPA Embutida, Glassmorphism, Dark Mode)
 */

import {
  APP_VERSION,
  APP_COMMIT_SHA,
  UPSTREAM_REPO_URL,
  UPSTREAM_REPO_NAME,
  UPSTREAM_AUTHOR,
  OMNIROUTE_INSPIRATION,
  OMNIROUTE_URL,
  DOCS_SITE_URL,
  DOCS_SITE_DEPLOY_URL,
  DOCS_SITE_API_URL,
  DOCS_FUNCTIONS_URL,
  DOCS_ENDPOINTS_URL,
} from "../config/version";

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

    .badge-upstream {
      background: rgba(129, 140, 248, 0.15);
      color: #c7d2fe;
      border: 1px solid rgba(129, 140, 248, 0.35);
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      transition: all 0.2s;
    }

    .badge-upstream:hover {
      background: rgba(129, 140, 248, 0.28);
      color: #fff;
      border-color: rgba(129, 140, 248, 0.6);
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
      gap: 0.6rem;
      padding: 0.6rem 0.75rem;
      background: #f8fafc !important;
      border: 1px solid #94a3b8;
      border-radius: 6px;
      color: #0f172a !important;
      font-size: 0.8rem;
    }
    .model-select-item:hover { background: #e2e8f0 !important; border-color: #38bdf8; }
    .model-select-item * { color: #0f172a; }
    .model-select-name { color: #020617 !important; opacity: 1 !important; font-weight: 700; }
    #mpm-discovered-list { background: #e2e8f0 !important; padding: 0.5rem; border: 1px solid #94a3b8; border-radius: 8px; }
    #mpm-model-search, #adm-model-search { color: #0f172a !important; background: #ffffff !important; border-color: #94a3b8 !important; }
    #mpm-model-search::placeholder, #adm-model-search::placeholder { color: #475569 !important; opacity: 1; }
    .admin-model-result { display:flex; justify-content:space-between; align-items:center; gap:0.6rem; padding:0.65rem 0.75rem; margin-bottom:0.35rem; background:#f8fafc !important; color:#0f172a !important; border:1px solid #94a3b8; border-radius:6px; }
    .admin-model-result * { color:#0f172a; }
    #adm-model-results { background:#e2e8f0; padding:0.5rem; border-radius:8px; }
    #adm-model-results:empty { display:none; }
    .model-select-item { min-height: 36px; }
    .model-select-item > div { min-width: 0; flex: 1 1 auto; }
    .model-select-item input[type=checkbox] {
      width: 18px !important; height: 18px !important; min-width: 18px !important; max-width: 18px !important;
      padding: 0 !important; margin: 0 0.4rem 0 0 !important; border-radius: 4px !important;
      background: #ffffff !important; border: 1px solid #94a3b8 !important;
      color: #0f172a !important; accent-color: #38bdf8; flex-shrink: 0; box-shadow: none !important;
      opacity: 1 !important; appearance: auto;
    }
    .model-select-item .model-select-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1 1 auto; }
    .model-select-item .btn { flex-shrink: 0; }

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
      <span id="header-storage-badge" class="badge-edge" style="display: none;"></span>
      <a href="${UPSTREAM_REPO_URL}" target="_blank" rel="noopener noreferrer" class="badge-edge badge-upstream" title="Repositório Upstream Oficial">
        Upstream: ${UPSTREAM_REPO_NAME} · v${APP_VERSION} (${APP_COMMIT_SHA}) ↗
      </a>
    </div>
    <nav>
      <button class="nav-btn active" onclick="showTab('overview')">Visão Geral</button>
      <button class="nav-btn" onclick="showTab('providers')">Provedores</button>
      <button class="nav-btn" onclick="showTab('search')">Busca Web & RAG</button>
      <button class="nav-btn" onclick="showTab('antigravity')">Antigravity OAuth</button>
      <button class="nav-btn" onclick="showTab('combos')">Combos & Quotas</button>
      <button class="nav-btn" onclick="showTab('playground')">Playground</button>
      <button class="nav-btn" onclick="showTab('docs')">Clientes</button>
      <a class="nav-btn" href="${DOCS_SITE_URL}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">📚 Documentação ↗</a>
      <a class="nav-btn" href="${DOCS_SITE_API_URL}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">🔌 Endpoints ↗</a>
      <button class="nav-btn nav-admin" onclick="showTab('admin')">⚙️ Administração</button>
      <button class="nav-btn" onclick="openAboutModal()" style="border: 1px solid rgba(129,140,248,0.3); color: #c7d2fe;">ℹ️ Sobre & Upstream</button>
      <button id="btn-admin-auth-header" class="nav-btn" style="border: 1px solid rgba(56,189,248,0.3); color: var(--primary);" onclick="openAdminAuthModal()">🔑 Autenticar</button>
    </nav>
  </header>

  <main>
    <!-- TAB 1: VISÃO GERAL -->
    <div id="tab-overview" class="tab-pane active">
      <!-- CARD UPSTREAM & ATRIBUIÇÃO OFICIAL -->
      <div class="card" style="border-left: 4px solid var(--primary); background: linear-gradient(135deg, rgba(18, 24, 38, 0.85) 0%, rgba(30, 41, 67, 0.65) 100%); margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.5rem; flex-wrap: wrap;">
              <span style="font-size: 1.15rem; font-weight: 700; color: #fff;">⚡ VeroRoute Edge</span>
              <span class="badge-edge" style="background: rgba(56, 189, 248, 0.15); color: var(--primary);">v${APP_VERSION}</span>
              <span class="badge-edge" style="background: rgba(16, 185, 129, 0.15); color: var(--emerald);">Commit: ${APP_COMMIT_SHA}</span>
              <span class="badge-edge" style="background: rgba(129, 140, 248, 0.15); color: #c7d2fe;">Upstream Oficial</span>
            </div>
            <p style="color: var(--text-muted); font-size: 0.88rem; line-height: 1.5; margin-bottom: 0.4rem;">
              Repositório Upstream: <a href="${UPSTREAM_REPO_URL}" target="_blank" rel="noopener noreferrer" style="color: var(--primary); text-decoration: none; font-weight: 600;">github.com/${UPSTREAM_REPO_NAME} ↗</a>
            </p>
            <p style="color: #94a3b8; font-size: 0.82rem; line-height: 1.5;">
              Criado por <strong>${UPSTREAM_AUTHOR}</strong> · Inspirado diretamente na robustez do <a href="${OMNIROUTE_URL}" target="_blank" rel="noopener noreferrer" style="color: #a5b4fc; text-decoration: none;">${OMNIROUTE_INSPIRATION} ↗</a> e na arquitetura do VeroRoute.
            </p>
          </div>
          <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
            <button class="btn btn-secondary" onclick="checkForUpstreamUpdates(this)" style="font-size: 0.82rem; padding: 0.45rem 0.85rem;">
              🔍 Verificar Atualizações
            </button>
            <button class="btn" onclick="openAboutModal()" style="font-size: 0.82rem; padding: 0.45rem 0.85rem;">
              📖 Sobre & Sincronização
            </button>
          </div>
        </div>
        <div id="overview-update-alert" style="display: none; margin-top: 0.85rem; padding: 0.65rem 0.9rem; border-radius: 8px; font-size: 0.82rem;"></div>
      </div>

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
            <button class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="loadAntigravityStatus()">
              🔄 Atualizar Status
            </button>
          </div>
        </div>

        <!-- Passo a Passo Autorização -->
        <div style="background: rgba(56, 189, 248, 0.03); border: 1px solid rgba(56, 189, 248, 0.15); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.75rem;">
          <h4 style="font-size: 0.95rem; margin-bottom: 0.5rem; color: var(--primary);">⚙️ Como Autenticar (Headless OAuth)</h4>
          <p style="color: var(--text-muted); font-size: 0.82rem; line-height: 1.5; margin-bottom: 1rem;">
            O login com Google não permite redirecionar de volta para este domínio automaticamente. Siga os passos abaixo:
          </p>
          <div style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.6; margin-top: 0.75rem;">
            <ol style="padding-left: 1.25rem; margin-bottom: 1.5rem;">
              <li style="margin-bottom: 0.5rem;">
                <strong>Etapa 1:</strong> Abra este link no seu navegador para fazer o login no Google:
                <br>
                <a id="agy-auth-btn" href="/api/oauth/antigravity/authorize" target="_blank" class="btn" style="padding: 0.35rem 0.75rem; font-size: 0.75rem; margin-top: 0.5rem; display: inline-block;">
                  🔗 Abrir Página de Login do Google
                </a>
              </li>
              <li style="margin-bottom: 0.5rem;">
                <strong>Etapa 2:</strong> Após aprovar o login, o Google tentará redirecionar você para uma página <code>http://127.0.0.1</code> e exibirá um erro de <strong>"Não é possível acessar esse site"</strong> no navegador. Isso é esperado!
              </li>
              <li>
                <strong>Etapa 3:</strong> Copie a <strong>URL completa</strong> que deu erro na barra de endereços do navegador (ou o código de autorização) e cole abaixo:
              </li>
            </ol>
          </div>
          <div>
            <textarea id="agy-token-input" rows="2" placeholder="Cole aqui a URL que deu erro (ex: http://127.0.0.1:443/callback?state=...&code=4/0AX4Xf...)" style="font-size: 0.85rem; font-family: monospace; width: 100%; margin-bottom: 0.75rem;"></textarea>
            <button class="btn" style="padding: 0.5rem 1.25rem; font-size: 0.85rem;" onclick="saveAgyToken()">
              Conectar Antigravity
            </button>
          </div>
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
              <option value="">Carregando modelos e combos...</option>
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
      <!-- CARD UPSTREAM & INSTÂNCIA NO ADMIN -->
      <div class="card" style="border-left: 4px solid var(--accent); background: linear-gradient(135deg, rgba(30, 27, 75, 0.5) 0%, rgba(18, 24, 38, 0.85) 100%); margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; flex-wrap: wrap;">
              <span style="font-size: 1.05rem; font-weight: 700; color: #fff;">🔒 Instância VeroRoute Edge</span>
              <span class="badge-edge" style="background: rgba(129, 140, 248, 0.2); color: #c7d2fe;">v${APP_VERSION} · ${APP_COMMIT_SHA}</span>
              <span class="badge-edge" style="background: rgba(16, 185, 129, 0.15); color: var(--emerald);">Edge Cloudflare</span>
            </div>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.35rem;">
              Upstream Oficial: <a href="${UPSTREAM_REPO_URL}" target="_blank" rel="noopener noreferrer" style="color: var(--primary); font-weight: 600; text-decoration: none;">${UPSTREAM_REPO_NAME} ↗</a> · Autor: <strong>${UPSTREAM_AUTHOR}</strong>
            </p>
            <div id="kv-status-banner">
              <p id="kv-status-message" style="color: #64748b; font-size: 0.8rem; line-height: 1.4;">
                Carregando status de persistência do Cloudflare KV...
              </p>
            </div>
          </div>
          <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
            <button class="btn btn-secondary" onclick="checkForUpstreamUpdates(this)" style="font-size: 0.82rem; padding: 0.45rem 0.85rem;">
              🔍 Checar Upstream
            </button>
            <button class="btn btn-secondary" onclick="openAboutModal()" style="font-size: 0.82rem; padding: 0.45rem 0.85rem;">
              📖 Como Atualizar
            </button>
          </div>
        </div>
        <div id="admin-update-alert" style="display: none; margin-top: 0.85rem; padding: 0.65rem 0.9rem; border-radius: 8px; font-size: 0.82rem;"></div>
      </div>

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
              <option value="firecrawl">Firecrawl (Search API)</option>
              <option value="exa">Exa AI Search</option>
              <option value="context7">Context7 API</option>
              <option value="linkup">Linkup Search</option>
              <option value="searchapi">SearchAPI</option>
              <option value="ydc">YDC Index</option>
            </select>
          </div>
          <div>
            <label style="font-size:0.85rem; color: var(--text-muted);">SearXNG URL (Opcional):</label>
            <input type="text" id="adm-search-searx" placeholder="Opcional — vazio usa DuckDuckGo gratuito">
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
          <div>
            <label style="font-size:0.85rem; color: var(--text-muted);">Firecrawl API Key:</label>
            <input type="password" id="adm-search-firecrawl" placeholder="fc-...">
          </div>
          <div>
            <label style="font-size:0.85rem; color: var(--text-muted);">Exa API Key:</label>
            <input type="password" id="adm-search-exa" placeholder="exa_...">
          </div>
          <div>
            <label style="font-size:0.85rem; color: var(--text-muted);">Context7 API Key:</label>
            <input type="password" id="adm-search-context7" placeholder="c7-...">
          </div>
          <div>
            <label style="font-size:0.85rem; color: var(--text-muted);">Linkup API Key:</label>
            <input type="password" id="adm-search-linkup" placeholder="lk-...">
          </div>
          <div>
            <label style="font-size:0.85rem; color: var(--text-muted);">SearchAPI API Key:</label>
            <input type="password" id="adm-search-searchapi" placeholder="sapi-...">
          </div>
          <div>
            <label style="font-size:0.85rem; color: var(--text-muted);">YDC Index API Key:</label>
            <input type="password" id="adm-search-ydc" placeholder="ydc-...">
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

  <!-- MODAL: AUTENTICAÇÃO DO ADMINISTRADOR -->
  <div id="modal-admin-auth" class="modal-overlay">
    <div class="modal-card" style="max-width: 440px; width: 92%;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <h3 style="margin: 0; font-size: 1.15rem; color: #fff; display: flex; align-items: center; gap: 0.5rem;">
          <span>🔒</span> Autenticação de Administrador
        </h3>
        <button type="button" class="btn btn-secondary" style="padding: 0.25rem 0.6rem; font-size: 0.85rem;" onclick="closeAdminAuthModal()">✕</button>
      </div>

      <p style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 0.8rem;">
        Insira a chave secreta <code>AUTH_TOKEN</code> configurada no seu Cloudflare Worker para acessar e gerenciar provedores, modelos, chaves e combos.
      </p>
      <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); padding: 0.6rem; border-radius: 6px; margin-bottom: 1.2rem;">
        <span style="color: var(--amber); font-size: 0.75rem;"><strong>Dica:</strong> Se você não configurou o Secret na Cloudflare, a senha padrão é <code>admin</code>.</span>
      </div>

      <div style="margin-bottom: 1rem;">
        <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #cbd5e1; margin-bottom: 0.4rem;">
          AUTH_TOKEN do VeroRoute Edge:
        </label>
        <div style="position: relative; display: flex; align-items: center;">
          <input type="password" id="admin-auth-input" placeholder="Cole seu AUTH_TOKEN aqui..." style="width: 100%; padding-right: 2.5rem; font-size: 0.85rem; font-family: monospace;" onkeydown="if(event.key==='Enter') submitAdminAuthModal()" />
          <button type="button" onclick="toggleAdminAuthVisibility()" style="position: absolute; right: 0.6rem; background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1rem;" title="Mostrar / Ocultar">👁️</button>
        </div>
        <div id="admin-auth-error" style="color: var(--rose); font-size: 0.75rem; margin-top: 0.4rem; display: none;"></div>
      </div>

      <div style="margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem;">
        <input type="checkbox" id="admin-auth-remember" checked style="cursor: pointer;" />
        <label for="admin-auth-remember" style="font-size: 0.78rem; color: var(--text-muted); cursor: pointer;">
          Lembrar autenticação neste navegador
        </label>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.5rem; border-top: 1px solid var(--card-border); padding-top: 0.85rem;">
        <button type="button" class="btn btn-secondary" onclick="closeAdminAuthModal()">Cancelar</button>
        <button type="button" class="btn" style="background: linear-gradient(135deg, var(--primary), var(--secondary));" onclick="submitAdminAuthModal()">Autenticar / Salvar</button>
      </div>
    </div>
  </div>

  <!-- MODAL: GERENCIAR MODELOS DO PROVEDOR -->
  <div id="modal-provider-models" class="modal-overlay">
    <div class="modal-card" style="max-width: 680px; width: 95%;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <h3 id="mpm-title" style="margin: 0; font-size: 1.15rem; color: #fff;">🤖 Modelos do Provedor</h3>
        <button type="button" class="btn btn-secondary" style="padding: 0.25rem 0.6rem; font-size: 0.85rem;" onclick="closeProviderModelsModal()">✕</button>
      </div>

      <!-- Alerta se não houver chaves para o provedor -->
      <div id="mpm-key-warning" style="display:none; background:rgba(245, 158, 11, 0.08); border:1px solid rgba(245, 158, 11, 0.25); border-radius:8px; padding:0.55rem 0.85rem; margin-bottom:1rem; font-size:0.78rem; color:var(--amber); justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
        <span>⚠️ Nenhuma chave de API salva para este provedor.</span>
        <button type="button" class="btn btn-secondary" style="padding:0.2rem 0.6rem; font-size:0.72rem; color:var(--amber); border-color:rgba(245, 158, 11, 0.4);" onclick="openProviderKeysModalFromModels()">🔑 Cadastrar Chave</button>
      </div>

      <!-- Modelos Atualmente Ativos -->
      <div style="margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <label style="display: block; font-size: 0.82rem; font-weight: 600; color: #fff; margin: 0;">
            Modelos Ativos / Habilitados:
          </label>
          <span id="mpm-active-count" style="font-size: 0.75rem; color: var(--primary);"></span>
        </div>
        <div id="mpm-active-list" style="display: flex; flex-wrap: wrap; gap: 0.4rem; max-height: 120px; overflow-y: auto; padding: 0.5rem; background: rgba(255,255,255,0.02); border: 1px solid var(--card-border); border-radius: 8px;">
          <!-- Tags dos modelos ativos -->
        </div>
      </div>

      <!-- Configuração de Endpoint & Chave de API para Busca / Teste -->
      <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--card-border); border-radius: 8px; padding: 0.75rem 0.85rem; margin-bottom: 1.25rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem; flex-wrap:wrap; gap:0.4rem;">
          <label style="font-size:0.8rem; font-weight:600; color:#fff; margin:0;">🌐 Endpoint / Base URL do Provedor:</label>
          <button type="button" class="btn btn-secondary" style="padding:0.2rem 0.55rem; font-size:0.72rem;" onclick="saveEndpointFromModelsModal()">💾 Salvar Endpoint</button>
        </div>
        <input type="text" id="mpm-endpoint-input" placeholder="https://..." style="width:100%; font-size:0.8rem; font-family:monospace; margin-bottom:0.4rem;" />
        <div id="mpm-endpoint-hint" style="font-size:0.72rem; color:var(--text-muted); margin-bottom:0.6rem; line-height:1.4;"></div>

        <label style="display:block; font-size:0.8rem; font-weight:600; color:#fff; margin-bottom:0.35rem;">🔑 Chave de API / Token (opcional para busca/teste imediato):</label>
        <input type="text" id="mpm-key-input" placeholder="Deixe em branco para usar as chaves salvas no pool" style="width:100%; font-size:0.8rem; font-family:monospace;" />
      </div>

      <!-- Descoberta Upstream & Catálogo -->
      <div style="background: rgba(56, 189, 248, 0.03); border: 1px solid rgba(56, 189, 248, 0.15); border-radius: 10px; padding: 1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
          <span style="font-weight: 600; font-size: 0.85rem; color: var(--primary);">
            🔍 Buscar Modelos Disponíveis (Upstream & Catálogo)
          </span>
          <div style="display: flex; gap: 0.35rem;">
            <button type="button" class="btn btn-secondary" style="padding: 0.25rem 0.55rem; font-size: 0.72rem;" onclick="selectAllDiscoveredModels(true)">
              Marcar Novos
            </button>
            <button type="button" class="btn btn-secondary" style="padding: 0.25rem 0.55rem; font-size: 0.72rem;" onclick="selectAllDiscoveredModels(false)">
              Desmarcar
            </button>
            <button type="button" id="mpm-btn-addall" class="btn btn-secondary" style="padding: 0.25rem 0.65rem; font-size: 0.72rem;" onclick="addAllDiscoveredModels()">
              + Adicionar Todos
            </button>
            <button type="button" id="mpm-btn-fetch" class="btn btn-secondary" style="padding: 0.25rem 0.65rem; font-size: 0.72rem;" onclick="fetchAvailableModels()">
              🔄 Recarregar
            </button>
            <button type="button" id="mpm-btn-test" class="btn btn-secondary" style="padding: 0.25rem 0.65rem; font-size: 0.72rem; color: var(--emerald); border-color: rgba(16, 185, 129, 0.3);" onclick="testProviderModels()">
              ⚡ Testar Modelos
            </button>
          </div>
        </div>

        <input type="text" id="mpm-model-search" placeholder="🔍 Filtrar modelos encontrados (ex: llama, deepseek, qwen, flash)..." oninput="filterDiscoveredModels()" style="width: 100%; margin-bottom: 0.5rem; font-size: 0.8rem;" />

        <div id="mpm-fetch-status" style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem;">
          Consultando catálogo e API...
        </div>
        <div id="mpm-discovered-list" style="max-height: 280px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.6rem;">
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
          <input type="text" id="mpm-manual-name" placeholder="Digite o identificador do modelo (ex: llama-3.3-70b-versatile, gemini-2.5-pro)" style="flex: 1; font-size: 0.82rem;" onkeydown="if(event.key==='Enter') addManualModel()" />
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

  <!-- MODAL: EDITAR ENDPOINT DO PROVEDOR -->
  <div id="modal-provider-endpoint" class="modal-overlay">
    <div class="modal-card" style="max-width: 540px; width: 95%;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <h3 id="mpe-title" style="margin: 0; font-size: 1.15rem; color: #fff;">🌐 Configurar Endpoint</h3>
        <button type="button" class="btn btn-secondary" style="padding: 0.25rem 0.6rem; font-size: 0.85rem;" onclick="closeProviderEndpointModal()">✕</button>
      </div>

      <div style="margin-bottom: 1rem;">
        <label style="display: block; font-size: 0.82rem; font-weight: 600; color: #fff; margin-bottom: 0.4rem;">
          URL Base do Endpoint:
        </label>
        <input type="text" id="mpe-baseurl" placeholder="https://..." style="width: 100%; font-size: 0.85rem; font-family: monospace;" />
        <div id="mpe-hint" style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.4rem; line-height: 1.45;"></div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--card-border); padding-top: 0.85rem; margin-top: 1rem; flex-wrap: wrap; gap: 0.5rem;">
        <button type="button" class="btn btn-secondary" style="font-size: 0.78rem;" onclick="resetProviderEndpoint()">🔄 Restaurar Padrão</button>
        <div style="display: flex; gap: 0.5rem;">
          <button type="button" class="btn btn-secondary" onclick="closeProviderEndpointModal()">Cancelar</button>
          <button type="button" class="btn" onclick="saveProviderEndpoint()">💾 Salvar Endpoint</button>
        </div>
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

  <!-- MODAL: CHAVE VIRTUAL GERADA (COPIÁVEL COM 1 CLIQUE) -->
  <div id="modal-key-success" class="modal-overlay">
    <div class="modal-card" style="max-width: 540px; width: 95%;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3 style="margin: 0; font-size: 1.15rem; color: #fff; display: flex; align-items: center; gap: 0.5rem;">
          🔑 Chave Virtual Criada com Sucesso
        </h3>
        <button type="button" class="btn btn-secondary" style="padding: 0.25rem 0.6rem; font-size: 0.85rem;" onclick="closeKeySuccessModal()">✕</button>
      </div>

      <p style="font-size: 0.84rem; color: var(--text-muted); margin-bottom: 1rem; line-height: 1.5;">
        Sua chave de acesso foi gerada. Copie-a abaixo e configure no seu <strong>Cursor, Cline, Claude Code, LibreChat</strong> ou cliente OpenAI:
      </p>

      <!-- Input com botão de cópia 1-clique e seleção facilitada -->
      <div style="background: rgba(0, 0, 0, 0.45); border: 1px solid var(--primary); border-radius: 8px; padding: 0.65rem 0.85rem; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.6rem;">
        <input type="text" id="mks-key-input" readonly onclick="this.select()" style="font-family: monospace; font-size: 0.92rem; width: 100%; background: transparent; border: none; color: var(--primary); outline: none; cursor: text;" />
        <button type="button" id="mks-copy-btn" class="btn" style="padding: 0.45rem 1rem; font-size: 0.82rem; white-space: nowrap; flex-shrink: 0;" onclick="copyKeySuccessValue()">
          📋 Copiar
        </button>
      </div>

      <div style="background: rgba(56, 189, 248, 0.04); border: 1px solid rgba(56, 189, 248, 0.15); border-radius: 8px; padding: 0.85rem; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1.25rem; line-height: 1.5;">
        <div><strong>Base URL (OpenAI API):</strong> <code id="mks-baseurl" style="color: var(--primary); font-family: monospace;"></code></div>
        <div style="margin-top: 0.4rem;"><strong>Modelos / Combos:</strong> Utilize o nome de qualquer combo (ex: <code>baratos</code>, <code>omni-free</code>, <code>omni-code</code>) no campo <code>model</code> do seu cliente.</div>
      </div>

      <div style="display: flex; justify-content: flex-end;">
        <button type="button" class="btn btn-secondary" style="padding: 0.45rem 1.2rem; font-size: 0.85rem;" onclick="closeKeySuccessModal()">Fechar</button>
      </div>
    </div>
  </div>

  <!-- MODAL: SOBRE, UPSTREAM & GUIA DE ATUALIZAÇÃO -->
  <div id="modal-about" class="modal-overlay">
    <div class="modal-card" style="max-width: 680px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <span style="font-size: 1.5rem;">⚡</span>
          <div>
            <h3 style="margin: 0; font-size: 1.25rem; color: #fff;">Sobre o VeroRoute Edge</h3>
            <span style="font-size: 0.8rem; color: var(--text-muted);">v${APP_VERSION} (Build/Commit: <code>${APP_COMMIT_SHA}</code>)</span>
          </div>
        </div>
        <button type="button" class="btn btn-secondary" onclick="closeAboutModal()" style="padding: 0.3rem 0.6rem; font-size: 0.85rem;">✕</button>
      </div>

      <!-- Seção de Upstream & Autoria -->
      <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--card-border); border-radius: 10px; padding: 1rem; margin-bottom: 1.25rem;">
        <div style="font-size: 0.9rem; font-weight: 600; color: #fff; margin-bottom: 0.4rem;">Origem & Atribuição</div>
        <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 0.5rem;">
          <strong>VeroRoute Edge</strong> é um projeto de código aberto desenvolvido por <strong>${UPSTREAM_AUTHOR}</strong>, concebido como um gateway de IA aerodinâmico e 100% serverless no Cloudflare Workers.
        </p>
        <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 0.5rem;">
          💡 <strong>Lineage & Inspiração:</strong> Inspirado na robustez de proxy e roteamento do projeto <a href="${OMNIROUTE_URL}" target="_blank" rel="noopener noreferrer" style="color: var(--accent); font-weight: 600; text-decoration: none;">${OMNIROUTE_INSPIRATION} ↗</a> e na arquitetura de economia de tokens do VeroRoute.
        </p>
        <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5;">
          🔗 <strong>Repositório Upstream Oficial:</strong><br>
          <a href="${UPSTREAM_REPO_URL}" target="_blank" rel="noopener noreferrer" style="color: var(--primary); font-weight: 600; word-break: break-all;">${UPSTREAM_REPO_URL} ↗</a>
        </p>
      </div>

      <!-- Documentacao Oficial -->
      <div style="background: rgba(14, 116, 136, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 10px; padding: 1rem; margin-bottom: 1.25rem;">
        <div style="font-size: 0.9rem; font-weight: 600; color: var(--primary); margin-bottom: 0.65rem;">📚 Documentação Oficial</div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0.55rem;">
          <a href="${DOCS_SITE_URL}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="text-decoration:none; text-align:center; font-size:0.8rem;">🌐 Abrir documentação</a>
          <a href="${DOCS_SITE_DEPLOY_URL}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="text-decoration:none; text-align:center; font-size:0.8rem;">🚀 Guia de implantação</a>
          <a href="${DOCS_SITE_API_URL}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="text-decoration:none; text-align:center; font-size:0.8rem;">🔌 Endpoints da API</a>
          <a href="${DOCS_FUNCTIONS_URL}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="text-decoration:none; text-align:center; font-size:0.8rem;">📖 Funções do sistema</a>
          <a href="${DOCS_ENDPOINTS_URL}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="text-decoration:none; text-align:center; font-size:0.8rem;">📋 Matriz detalhada</a>
        </div>
      </div>

      <!-- Verificador de Atualizações em Tempo Real -->
      <div style="background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 10px; padding: 1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
          <span style="font-size: 0.9rem; font-weight: 600; color: var(--primary);">📡 Verificador de Atualizações do Upstream</span>
          <button type="button" class="btn" onclick="checkForUpstreamUpdates(this)" style="font-size: 0.8rem; padding: 0.35rem 0.75rem;">Verificar Agora</button>
        </div>
        <div id="modal-update-status" style="font-size: 0.82rem; color: var(--text-muted);">
          Clique em "Verificar Agora" para checar novos commits ou versões no repositório upstream oficial.
        </div>
      </div>

      <!-- Documentação e endpoints -->
      <div style="background: rgba(14, 116, 136, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 10px; padding: 1rem; margin-bottom: 1.25rem;">
        <div style="font-size: 0.9rem; font-weight: 600; color: var(--primary); margin-bottom: 0.5rem;">📚 Documentação Oficial</div>
        <p style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 0.7rem;">
          Guias de instalação, arquitetura, provedores e a referência completa dos endpoints ficam no site oficial de documentação.
        </p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0.55rem;">
          <a href="${DOCS_SITE_URL}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="text-decoration:none; text-align:center; font-size:0.8rem;">🌐 Site de documentação</a>
          <a href="${DOCS_FUNCTIONS_URL}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="text-decoration:none; text-align:center; font-size:0.8rem;">📖 Funções do sistema</a>
        </div>
      </div>

      <!-- Como Manter sua Instância Atualizada -->
      <!-- Video tutorial de instalacao (fachada: sem requisicao a terceiros ate o clique) -->
      <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--card-border); border-radius: 10px; padding: 1rem; margin-bottom: 1.25rem;">
        <div style="font-size: 0.9rem; font-weight: 600; color: #fff; margin-bottom: 0.5rem;">🎥 Vídeo tutorial de instalação</div>
        <p style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 0.75rem;">
          Assista ao processo completo: fork, conexão com o GitHub, deploy no Cloudflare e configuração do <code>AUTH_TOKEN</code>.
        </p>
        <div id="video-guide-facade" role="button" tabindex="0" onclick="playInstallVideo()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();playInstallVideo();}" style="position: relative; width: 100%; aspect-ratio: 16 / 9; max-width: 560px; margin: 0 auto; border-radius: 10px; overflow: hidden; border: 1px solid var(--card-border); background: #000; cursor: pointer;">
          <img src="https://i.ytimg.com/vi/Qv4iJX8XCD8/maxresdefault.jpg" alt="Miniatura do tutorial de instalação do VeroRoute Edge" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; display: block;">
          <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(2, 6, 16, 0.35);">
            <div style="width: 68px; height: 48px; border-radius: 12px; background: #ff0000; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 20px rgba(0,0,0,0.6);">
              <span style="color: #fff; font-size: 1.4rem; margin-left: 4px;">▶</span>
            </div>
          </div>
        </div>
        <p style="font-size: 0.78rem; color: var(--text-muted); text-align: center; margin: 0.7rem 0 0;">
          O vídeo só é carregado quando você clicar · <a href="https://www.youtube.com/watch?v=Qv4iJX8XCD8" target="_blank" rel="noopener noreferrer" style="color: var(--primary); font-weight: 600; text-decoration: none;">abrir no YouTube ↗</a>
        </p>
      </div>

      <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--card-border); border-radius: 10px; padding: 1rem; margin-bottom: 1.25rem;">
        <div style="font-size: 0.9rem; font-weight: 600; color: #fff; margin-bottom: 0.5rem;">🔄 Como Atualizar Sua Instância (Sem Perder Configurações)</div>
        <p style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 0.6rem;">
          Suas chaves de provedores, combos e configurações são armazenadas no Cloudflare KV (<code>OMNI_KEYS</code> e <code>OMNI_CACHE</code>). Atualizar o código <strong>NUNCA</strong> apaga suas chaves nem configurações.
        </p>
        <p style="font-size: 0.82rem; color: var(--amber); line-height: 1.5; margin-bottom: 0.6rem;">
          ⚠️ <strong>Atenção ao <code>AUTH_TOKEN</code>:</strong> o valor padrão <code>admin</code> fica no <code>wrangler.toml</code> para que instalações novas já funcionem. Por isso, cada <strong>Sync fork</strong> ou novo build pode devolver a variável para <code>admin</code> e substituir a senha que você definiu. Depois de atualizar, abra Settings → Variables and Secrets, confira o <code>AUTH_TOKEN</code>, salve novamente sua senha e clique em Deploy.
        </p>
        <div style="font-size: 0.82rem; color: var(--primary); font-weight: 600; margin-bottom: 0.35rem;">Opção 1: Via GitHub "Sync Fork" (Mais Fácil / Sem Comandos)</div>
        <p style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 0.75rem;">
          Se você conectou seu GitHub à Cloudflare: abra o repositório do seu Fork no GitHub, clique no botão <strong>Sync fork</strong> ➔ <strong>Update branch</strong>. A Cloudflare detectará a mudança e atualizará seu Worker automaticamente em menos de 1 minuto!
        </p>

        <div style="font-size: 0.82rem; color: #fff; font-weight: 600; margin-bottom: 0.35rem;">Opção 2: Via Git CLI</div>
        <div class="code-box" style="font-size: 0.78rem; padding: 0.6rem; margin-bottom: 0.75rem;">
git remote add upstream ${UPSTREAM_REPO_URL}.git<br>
git pull upstream master<br>
git push origin master
        </div>

        <div style="font-size: 0.82rem; color: #fff; font-weight: 600; margin-bottom: 0.35rem;">Opção 3: Redeploy no Cloudflare Dashboard</div>
        <p style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.5;">
          No painel do Cloudflare Workers & Pages, acione um <em>Redeploy</em> a partir do commit da branch <code>master</code>. Seus namespaces de KV permanecerão vinculados.
        </p>
      </div>

      <!-- Licença & Atribuição MIT -->
      <div style="font-size: 0.78rem; color: #64748b; line-height: 1.5; text-align: center;">
        Distribuído sob Licença MIT. É obrigatório manter o aviso de direitos autorais e atribuição à autoria de Samuel Santos e ao projeto upstream em qualquer redistribuição ou modificação.
      </div>

      <div style="display: flex; justify-content: flex-end; margin-top: 1rem;">
        <button type="button" class="btn btn-secondary" onclick="closeAboutModal()">Fechar</button>
      </div>
    </div>
  </div>

  <script>
    function openAboutModal() {
      var m = document.getElementById('modal-about');
      if (m) m.classList.add('active');
    }

    function playInstallVideo() {
      var facade = document.getElementById('video-guide-facade');
      if (!facade || facade.dataset.playing === 'true') return;
      facade.dataset.playing = 'true';
      var frame = document.createElement('iframe');
      frame.src = 'https://www.youtube-nocookie.com/embed/Qv4iJX8XCD8?autoplay=1&rel=0';
      frame.title = 'Como instalar e configurar o VeroRoute Edge passo a passo';
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      frame.allowFullscreen = true;
      frame.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;';
      facade.innerHTML = '';
      facade.appendChild(frame);
    }

    function closeAboutModal() {
      var m = document.getElementById('modal-about');
      if (m) m.classList.remove('active');
    }

    async function checkForUpstreamUpdates(btnEl) {
      var origText = btnEl ? btnEl.innerHTML : '';
      if (btnEl) {
        btnEl.disabled = true;
        btnEl.innerHTML = '⏳ Checando...';
      }

      var currentSha = '${APP_COMMIT_SHA}';
      var statusModal = document.getElementById('modal-update-status');
      var overviewAlert = document.getElementById('overview-update-alert');
      var adminAlert = document.getElementById('admin-update-alert');

      function renderResult(html, isSuccess, isBehind) {
        if (statusModal) statusModal.innerHTML = html;
        [overviewAlert, adminAlert].forEach(function(el) {
          if (el) {
            el.style.display = 'block';
            el.innerHTML = html;
            el.style.background = isBehind ? 'rgba(245, 158, 11, 0.15)' : (isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)');
            el.style.border = isBehind ? '1px solid rgba(245, 158, 11, 0.4)' : (isSuccess ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(244, 63, 94, 0.4)');
            el.style.color = isBehind ? '#fde68a' : (isSuccess ? '#a7f3d0' : '#fecdd3');
          }
        });
      }

      try {
        var resp = await fetch('https://api.github.com/repos/samucamg/veroroute-edge/commits/master', {
          headers: { 'Accept': 'application/vnd.github.v3+json' }
        });
        if (!resp.ok) {
          throw new Error('HTTP ' + resp.status + ': ' + resp.statusText);
        }
        var data = await resp.json();
        var remoteSha = (data && data.sha) ? data.sha.substring(0, 7) : '';
        var commitMsg = (data && data.commit && data.commit.message) ? data.commit.message.split('\\n')[0] : '';
        var commitUrl = (data && data.html_url) ? data.html_url : 'https://github.com/samucamg/veroroute-edge';

        if (remoteSha && (remoteSha.startsWith(currentSha.substring(0, 7)) || currentSha.startsWith(remoteSha))) {
          renderResult('✅ <strong>Sua instância está 100% atualizada com o Upstream oficial!</strong> (Commit: <code>' + currentSha + '</code>)', true, false);
          showToast('Sua instância está atualizada com o upstream oficial!', 'success');
        } else {
          var html = '🚀 <strong>Nova atualização disponível no Upstream!</strong><br>' +
            'Versão local: <code>' + currentSha + '</code> → Upstream mais recente: <a href="' + commitUrl + '" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline; font-weight: bold;"><code>' + remoteSha + '</code></a>: <em>"' + escapeHtml(commitMsg) + '"</em>.<br>' +
            '<span style="font-size:0.78rem;">Siga o guia no botão "Como Atualizar" para sincronizar com segurança sem perder suas chaves do KV.</span>';
          renderResult(html, true, true);
          showToast('Nova atualização disponível no upstream (' + remoteSha + ')', 'info');
        }
      } catch (err) {
        var msg = '⚠️ Não foi possível verificar o GitHub: ' + (err.message || err);
        renderResult(msg, false, false);
        showToast(msg, 'error');
      } finally {
        if (btnEl) {
          btnEl.disabled = false;
          btnEl.innerHTML = origText || '🔍 Verificar Atualizações';
        }
      }
    }
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
      else if (tabId === 'playground') populatePlaygroundModels();
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

    var pendingAuthResolvers = [];

    function getAdminToken() {
      return sessionStorage.getItem('vr_admin_token') || localStorage.getItem('vr_admin_token') || '';
    }

    function setAdminToken(t, remember) {
      if (!t || !t.trim()) return;
      var clean = t.trim();
      sessionStorage.setItem('vr_admin_token', clean);
      if (remember !== false) {
        localStorage.setItem('vr_admin_token', clean);
      }
      updateAdminAuthHeaderStatus();
    }

    function clearAdminToken() {
      sessionStorage.removeItem('vr_admin_token');
      localStorage.removeItem('vr_admin_token');
      updateAdminAuthHeaderStatus();
    }

    function updateAdminAuthHeaderStatus() {
      var btn = document.getElementById('btn-admin-auth-header');
      if (!btn) return;
      var token = getAdminToken();
      if (token) {
        btn.innerText = '🔑 Admin: Ativo';
        btn.style.color = 'var(--emerald)';
        btn.style.borderColor = 'rgba(16,185,129,0.4)';
        btn.title = 'Admin autenticado. Clique para alterar o AUTH_TOKEN.';
      } else {
        btn.innerText = '🔑 Autenticar';
        btn.style.color = 'var(--primary)';
        btn.style.borderColor = 'rgba(56,189,248,0.28)';
        btn.title = 'Clique para inserir o AUTH_TOKEN de administrador.';
      }
    }

    function openAdminAuthModal() {
      var input = document.getElementById('admin-auth-input');
      var errEl = document.getElementById('admin-auth-error');
      if (input) {
        input.value = getAdminToken();
        input.type = 'password';
      }
      if (errEl) {
        errEl.style.display = 'none';
        errEl.innerText = '';
      }
      var modal = document.getElementById('modal-admin-auth');
      if (modal) modal.classList.add('active');
      if (input) setTimeout(function() { input.focus(); }, 80);
    }

    function closeAdminAuthModal() {
      var modal = document.getElementById('modal-admin-auth');
      if (modal) modal.classList.remove('active');
      while (pendingAuthResolvers.length > 0) {
        var item = pendingAuthResolvers.shift();
        item.reject(new Error('Autenticação cancelada pelo usuário.'));
      }
    }

    function toggleAdminAuthVisibility() {
      var input = document.getElementById('admin-auth-input');
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
    }

    function submitAdminAuthModal() {
      var input = document.getElementById('admin-auth-input');
      var errEl = document.getElementById('admin-auth-error');
      var rememberEl = document.getElementById('admin-auth-remember');
      var remember = rememberEl ? rememberEl.checked : true;
      var val = input ? input.value.trim() : '';

      if (!val) {
        if (errEl) {
          errEl.innerText = 'Por favor, insira o AUTH_TOKEN.';
          errEl.style.display = 'block';
        }
        return;
      }

      setAdminToken(val, remember);
      var modal = document.getElementById('modal-admin-auth');
      if (modal) modal.classList.remove('active');
      showToast('AUTH_TOKEN salvo com sucesso!', 'success');

      var resolvers = pendingAuthResolvers.slice();
      pendingAuthResolvers = [];
      resolvers.forEach(function(item) { item.resolve(val); });

      loadAdmin();
      loadCombos();
    }

    function ensureAdminToken() {
      var token = getAdminToken();
      if (token) return Promise.resolve(token);
      return new Promise(function(resolve, reject) {
        pendingAuthResolvers.push({ resolve: resolve, reject: reject });
        openAdminAuthModal();
      });
    }

    async function adminFetch(url, opts) {
      var token = await ensureAdminToken();
      opts = opts || {};
      opts.headers = Object.assign({ 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, opts.headers || {});
      var res = await fetch(url, opts);
      if (res.status === 401) {
        clearAdminToken();
        var errEl = document.getElementById('admin-auth-error');
        if (errEl) {
          errEl.innerText = 'AUTH_TOKEN inválido ou rejeitado pelo servidor.';
          errEl.style.display = 'block';
        }
        var modal = document.getElementById('modal-admin-auth');
        if (!modal || !modal.classList.contains('active')) {
          showToast('AUTH_TOKEN inválido ou não autorizado.', 'error');
          openAdminAuthModal();
        }
        throw new Error('AUTH_TOKEN inválido.');
      }
      return res;
    }

    function v1Fetch(url, opts) {
      opts = opts || {};
      var tok = getAdminToken();
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
      if (!val) return showToast('Por favor, insira o token ou JSON', 'error');
      try {
        const res = await adminFetch('/api/oauth/antigravity/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: val })
        });
        const data = await res.json();
        if (data.ok) {
          showToast('Credenciais salvas com sucesso!', 'success');
          document.getElementById('agy-token-input').value = '';
          loadAntigravityStatus();
        } else {
          showToast('Erro ao salvar: ' + (data.error || 'Desconhecido'), 'error');
        }
      } catch (e) {
        showToast('Erro: ' + e.message, 'error');
      }
    }

    function saveSearxUrl() {
      const url = document.getElementById('custom-searx-url').value.trim();
      localStorage.setItem('veroroute_searx_url', url);
      alert(url
        ? 'URL opcional do SearXNG salva neste navegador.'
        : 'URL removida. As buscas usarão DuckDuckGo gratuitamente, sem URL ou chave.');
    }

    // ============ PLAYGROUND ============
    var _playgroundModelsLoaded = false;
    async function populatePlaygroundModels() {
      if (_playgroundModelsLoaded) return;
      const sel = document.getElementById('chat-model');
      if (!sel) return;
      try {
        // 1. Combos (requer auth)
        var combosData = [];
        try {
          var combosRes = await adminFetch('/api/admin/combos');
          var combosJson = await combosRes.json();
          combosData = combosJson.combos || [];
        } catch(_) {}

        // 2. Modelos diretos via /v1/models (público)
        var directModels = [];
        try {
          var tok = getAdminToken();
          var modelsRes = await fetch('/v1/models', tok ? { headers: { 'Authorization': 'Bearer ' + tok } } : undefined);
          var modelsJson = await modelsRes.json();
          directModels = modelsJson.data || [];
        } catch(_) {}

        sel.innerHTML = '';

        // Grupo 1: Combos
        if (combosData.length > 0) {
          var g1 = document.createElement('optgroup');
          g1.label = '\uD83D\uDD00 Combos (Roteamento Inteligente)';
          combosData.forEach(function(c) {
            var o = document.createElement('option');
            o.value = c.id;
            o.textContent = c.name && c.name !== c.id ? c.id + ' \u2014 ' + c.name : c.id;
            g1.appendChild(o);
          });
          sel.appendChild(g1);
        }

        // Grupo 2: Modelos diretos, agrupados por provedor (owned_by)
        if (directModels.length > 0) {
          var byProvider = {};
          directModels.forEach(function(m) {
            var p = m.owned_by || 'outros';
            if (!byProvider[p]) byProvider[p] = [];
            byProvider[p].push(m);
          });
          Object.entries(byProvider).forEach(function(entry) {
            var prov = entry[0], mods = entry[1];
            var g = document.createElement('optgroup');
            g.label = '\uD83D\uDCE6 ' + prov;
            mods.forEach(function(m) {
              var o = document.createElement('option');
              o.value = m.id;
              o.textContent = m.id;
              g.appendChild(o);
            });
            sel.appendChild(g);
          });
        }

        // Fallback se tudo falhou
        if (sel.options.length === 0) {
          sel.innerHTML = '<option value="omni-free">omni-free (fallback)</option>';
        }

        _playgroundModelsLoaded = true;
      } catch(e) {
        sel.innerHTML = '<option value="omni-free">omni-free (fallback)</option>';
      }
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
        
        const kvStatusContainer = document.getElementById('kv-status-banner');
        const headerStorageBadge = document.getElementById('header-storage-badge');
        
        if (data.hasKV) {
          if (headerStorageBadge) {
            headerStorageBadge.style.display = 'inline-block';
            headerStorageBadge.style.background = 'rgba(16, 185, 129, 0.15)';
            headerStorageBadge.style.color = 'var(--emerald)';
            headerStorageBadge.innerHTML = '🟢 KV Ativo (Permanente)';
          }
          if (kvStatusContainer) {
            kvStatusContainer.innerHTML =
              '<div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 0.75rem 1rem; margin-top: 0.5rem;">' +
                '<div style="color: var(--emerald); font-weight: 600; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem;">' +
                  '<span>✅ Persistência Cloudflare KV Ativa (OMNI_KEYS)</span>' +
                '</div>' +
                '<div style="color: #94a3b8; font-size: 0.8rem; margin-top: 0.3rem; line-height: 1.4;">' +
                  'Todas as credenciais de provedores, configurações e tokens persistem no banco KV. Sincronizações com o GitHub não apagarão seus dados.' +
                '</div>' +
              '</div>';
          }
        } else {
          if (headerStorageBadge) {
            headerStorageBadge.style.display = 'inline-block';
            headerStorageBadge.style.background = 'rgba(244, 63, 94, 0.2)';
            headerStorageBadge.style.color = '#fb7185';
            headerStorageBadge.innerHTML = '⚠️ Memória Volátil (Sem KV)';
          }
          if (kvStatusContainer) {
            kvStatusContainer.innerHTML =
              '<div style="background: rgba(244, 63, 94, 0.12); border: 1px solid rgba(244, 63, 94, 0.4); border-radius: 8px; padding: 0.9rem; margin-top: 0.75rem;">' +
                '<div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.4rem;">' +
                  '<span style="font-weight: 700; color: #fb7185; font-size: 0.92rem;">⚠️ ALERTA: Armazenamento em Memória Volátil Ativo</span>' +
                  '<button class="btn btn-secondary" onclick="loadAdmin()" style="font-size: 0.75rem; padding: 0.3rem 0.6rem;">🔄 Re-testar KV</button>' +
                '</div>' +
                '<p style="color: #cbd5e1; font-size: 0.82rem; line-height: 1.45; margin-bottom: 0.6rem;">' +
                  'O banco de dados <code>OMNI_KEYS</code> não foi detectado neste Worker. O sistema está rodando na <strong>memória RAM temporária</strong> e <strong>perderá todas as chaves e configurações</strong> assim que o Worker reiniciar (por inatividade ou novo deploy).' +
                '</p>' +
                '<div style="background: rgba(15, 23, 42, 0.7); border-radius: 6px; padding: 0.6rem 0.85rem; font-size: 0.8rem; color: #94a3b8; line-height: 1.6;">' +
                  '<strong style="color: #fff;">Como vincular seu KV na Cloudflare em 1 minuto:</strong><br>' +
                  '1. No painel da Cloudflare, acesse <strong>Workers & Pages</strong> ➔ clique no seu Worker.<br>' +
                  '2. Vá em <strong>Settings</strong> ➔ <strong>Bindings</strong> (ou Variables &amp; Bindings).<br>' +
                  '3. Clique em <strong>Add</strong> ➔ selecione <strong>KV Namespace</strong>.<br>' +
                  '4. Defina <strong>Variable name:</strong> <code>OMNI_KEYS</code> e selecione o seu namespace KV de chaves.<br>' +
                  '5. Repita para <strong>Variable name:</strong> <code>OMNI_CACHE</code> selecionando seu KV de cache.<br>' +
                  '6. Clique em <strong>Save and Deploy</strong> e depois clique no botão "Re-testar KV" acima!' +
                '</div>' +
              '</div>';
          }
        }
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
        const customBadge = p.hasCustomEndpoint ? '<span style="font-size:0.65rem; padding:0.1rem 0.35rem; border-radius:4px; background:rgba(56,189,248,0.2); color:var(--primary); font-weight:600;">custom</span>' : '';
        const displayUrl = p.baseUrl || p.defaultBaseUrl || '(padrão)';
        box.innerHTML =
          '<div class="provider-header">' +
            '<span class="provider-name">' + escapeHtml(p.name) + '</span>' +
            '<span class="status-dot" style="background:' + (p.enabled ? 'var(--emerald)' : 'var(--rose)') + ';box-shadow:0 0 8px ' + (p.enabled ? 'var(--emerald)' : 'var(--rose)') + '"></span>' +
          '</div>' +
          '<div style="display:flex; align-items:center; justify-content:space-between; gap:0.4rem; font-size:0.75rem; color:var(--text-muted); margin-bottom:0.2rem;">' +
            '<span>' + (p.isBuiltIn ? 'Embutido' : 'Customizado') + ' · ' + (p.protocol || 'openai') + '</span>' +
            customBadge +
          '</div>' +
          '<div style="font-size:0.72rem; color:var(--text-muted); background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:6px; padding:0.25rem 0.5rem; margin-bottom:0.35rem; display:flex; align-items:center; gap:0.35rem; overflow:hidden;" title="' + escapeHtml(displayUrl) + '">' +
            '<span>🌐</span>' +
            '<span style="font-family:monospace; font-size:0.7rem; color:var(--text-main); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; user-select:all; cursor:text;">' + escapeHtml(displayUrl) + '</span>' +
          '</div>' +
          '<span style="font-size:0.75rem; color: var(--primary); word-break:break-all;">Modelos (' + modelCount + '): ' + (p.models || []).slice(0, 3).join(', ') + (modelCount > 3 ? '...' : '') + '</span>' +
          '<span style="font-size:0.75rem; color: var(--text-muted);">' + (p.id === 'antigravity' ? 'Autenticação: <strong>Google OAuth (Code Assist)</strong>' : 'Chaves no Pool: <strong>' + keyCount + '</strong>') + '</span>' +
          '<div style="display:flex; gap:0.35rem; flex-wrap:wrap; margin-top:0.5rem;">' +
            '<button class="btn btn-secondary" style="padding:0.25rem 0.55rem; font-size:0.72rem;" onclick="toggleProvider(&apos;' + escapeHtml(p.id) + '&apos;,' + (p.enabled ? 'false' : 'true') + ')">' + (p.enabled ? 'Desativar' : 'Ativar') + '</button>' +
            '<button class="btn btn-secondary" style="padding:0.25rem 0.55rem; font-size:0.72rem;" onclick="openProviderEndpointModal(&apos;' + escapeHtml(p.id) + '&apos;)">🌐 Endpoint</button>' +
            (p.id === 'antigravity'
              ? '<button class="btn btn-secondary" style="padding:0.25rem 0.55rem; font-size:0.72rem; border-color:var(--primary); color:var(--primary);" onclick="showTab(&apos;antigravity&apos;)">🔐 Google OAuth (' + keyCount + ' conta(s))</button>'
              : '<button class="btn btn-secondary" style="padding:0.25rem 0.55rem; font-size:0.72rem;" onclick="openProviderKeysModal(&apos;' + escapeHtml(p.id) + '&apos;)">🔑 Chaves (' + keyCount + ')</button>') +
            '<button class="btn btn-secondary" style="padding:0.25rem 0.55rem; font-size:0.72rem;" onclick="openProviderModelsModal(&apos;' + escapeHtml(p.id) + '&apos;)">🤖 Modelos (' + modelCount + ')</button>' +
            (!p.isBuiltIn ? '<button class="btn btn-secondary" style="padding:0.25rem 0.55rem; font-size:0.72rem; background:rgba(244,63,94,0.15); color:var(--rose);" onclick="deleteCustomProvider(&apos;' + escapeHtml(p.id) + '&apos;)">Excluir</button>' : '') +
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
      if (providerId === 'antigravity') {
        box.innerHTML = '<strong>Provedor:</strong> ' + escapeHtml(provName) + '<br>' +
          '<div style="background:rgba(56,189,248,0.1); border:1px solid rgba(56,189,248,0.3); border-radius:6px; padding:0.6rem; margin-top:0.4rem; font-size:0.8rem; color:#cbd5e1;">' +
            'ℹ️ O <strong>Antigravity CLI</strong> conecta diretamente com sua conta Google através de OAuth. Ele <strong>não necessita</strong> de chaves de API manuais inseridas aqui.<br>' +
            '<button type="button" class="btn" style="margin-top:0.5rem; font-size:0.8rem; padding:0.35rem 0.75rem;" onclick="closeProviderKeysModal(); showTab(&apos;antigravity&apos;);">🔐 Conectar Conta Google (Antigravity OAuth) ↗</button>' +
          '</div>';
      } else {
        box.innerHTML = '<strong>Provedor:</strong> ' + escapeHtml(provName) + ' (' + escapeHtml(p ? p.protocol || 'openai' : '') + ')<br>' +
          '<strong>Status do Pool:</strong> ' + (count > 0 ? '<span style="color:var(--emerald); font-weight:600;">' + count + ' chave(s) ativa(s) no balanceamento</span>' : '<span style="color:var(--amber);">Nenhuma chave cadastrada neste Worker</span>');
      }

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
      const keys = val.split(/[\\n,]+/).map(function(s) { return s.trim(); }).filter(Boolean);
      try {
        const res = await adminFetch('/api/admin/providers/' + activeModalProviderId + '/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credentials: keys.map(function(apiKey) { return { apiKey: apiKey }; }) })
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

    function openProviderKeysModalFromModels() {
      var pid = activeModalProviderId;
      closeProviderModelsModal();
      if (pid) openProviderKeysModal(pid);
    }

    function getProviderEndpointHint(providerId) {
      if (providerId === 'azure') {
        return '<strong>Azure OpenAI:</strong> Informe a URL do seu recurso (ex: <code>https://seu-recurso.openai.azure.com</code>). O VeroRoute Edge roteará para seus deployments configurados.';
      }
      if (providerId === 'bedrock') {
        return '<strong>AWS Bedrock:</strong> Informe a URL do proxy compatível com OpenAI (ex: Cloudflare AI Gateway <code>https://gateway.ai.cloudflare.com/v1/{account}/{gateway}/aws-bedrock</code> ou LiteLLM).';
      }
      if (providerId === 'gemini') {
        return '<strong>Google Gemini:</strong> Endpoint REST da API Google AI Studio (padrão: <code>https://generativelanguage.googleapis.com/v1beta</code>).';
      }
      if (providerId === '1min') {
        return '<strong>1min.ai:</strong> Endpoint oficial da API (padrão: <code>https://api.1min.ai/api/chat-with-ai</code>).';
      }
      if (providerId === 'openai') {
        return '<strong>OpenAI Oficial:</strong> Padrão <code>https://api.openai.com/v1</code> ou seu Cloudflare AI Gateway.';
      }
      return 'URL Base do provedor para chamadas de API e descoberta de modelos. Suporta Cloudflare AI Gateway, LiteLLM ou proxies privados.';
    }

    function openProviderEndpointModal(providerId) {
      activeModalProviderId = providerId;
      var p = (window._providersData || []).find(function(x) { return x.id === providerId; });
      var provName = p ? p.name : providerId;
      document.getElementById('mpe-title').innerText = '🌐 Endpoint: ' + provName;
      var input = document.getElementById('mpe-baseurl');
      if (input) input.value = p ? (p.baseUrl || p.defaultBaseUrl || '') : '';
      var hintEl = document.getElementById('mpe-hint');
      if (hintEl) hintEl.innerHTML = getProviderEndpointHint(providerId);
      document.getElementById('modal-provider-endpoint').classList.add('active');
    }

    function closeProviderEndpointModal() {
      document.getElementById('modal-provider-endpoint').classList.remove('active');
    }

    async function saveProviderEndpoint() {
      if (!activeModalProviderId) return;
      var input = document.getElementById('mpe-baseurl');
      var newUrl = input ? input.value.trim() : '';
      try {
        var res = await adminFetch('/api/admin/providers/' + activeModalProviderId + '/endpoint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baseUrl: newUrl })
        });
        var data = await res.json();
        if (data.ok) {
          showToast('Endpoint atualizado com sucesso!', 'success');
          closeProviderEndpointModal();
          await loadAdmin();
        } else {
          showToast('Erro ao salvar endpoint: ' + JSON.stringify(data.error || data), 'error');
        }
      } catch (e) {
        showToast('Erro: ' + e.message, 'error');
      }
    }

    async function resetProviderEndpoint() {
      if (!activeModalProviderId) return;
      try {
        var res = await adminFetch('/api/admin/providers/' + activeModalProviderId + '/endpoint', {
          method: 'DELETE'
        });
        var data = await res.json();
        if (data.ok) {
          showToast('Endpoint restaurado para o padrão!', 'info');
          closeProviderEndpointModal();
          await loadAdmin();
        } else {
          showToast('Erro ao restaurar endpoint: ' + JSON.stringify(data.error || data), 'error');
        }
      } catch (e) {
        showToast('Erro: ' + e.message, 'error');
      }
    }

    async function saveEndpointFromModelsModal() {
      if (!activeModalProviderId) return;
      var input = document.getElementById('mpm-endpoint-input');
      var newUrl = input ? input.value.trim() : '';
      try {
        var res = await adminFetch('/api/admin/providers/' + activeModalProviderId + '/endpoint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baseUrl: newUrl })
        });
        var data = await res.json();
        if (data.ok) {
          showToast('Endpoint salvo com sucesso!', 'success');
          await loadAdmin();
          var p = (window._providersData || []).find(function(x) { return x.id === activeModalProviderId; });
          if (p) p.baseUrl = data.baseUrl;
        } else {
          showToast('Erro ao salvar endpoint: ' + JSON.stringify(data.error || data), 'error');
        }
      } catch (e) {
        showToast('Erro: ' + e.message, 'error');
      }
    }

    // Gerenciador de Modelos
    function openProviderModelsModal(providerId) {
      activeModalProviderId = providerId;
      var p = (window._providersData || []).find(function(x) { return x.id === providerId; });
      var provName = p ? p.name : providerId;
      document.getElementById('mpm-title').innerText = '🤖 Modelos: ' + provName;

      var warnEl = document.getElementById('mpm-key-warning');
      if (warnEl) {
        var needsKey = p && (p.keyCount === 0 || !p.keyCount) && providerId !== 'cloudflare-ai' && providerId !== 'antigravity' && providerId !== 'pollinations' && providerId !== 'freeapikey';
        warnEl.style.display = needsKey ? 'flex' : 'none';
      }

      var endpointInput = document.getElementById('mpm-endpoint-input');
      if (endpointInput) endpointInput.value = p ? (p.baseUrl || p.defaultBaseUrl || '') : '';
      var endpointHint = document.getElementById('mpm-endpoint-hint');
      if (endpointHint) endpointHint.innerHTML = getProviderEndpointHint(providerId);
      var keyInput = document.getElementById('mpm-key-input');
      if (keyInput) keyInput.value = '';

      renderActiveModelsList();

      var searchInput = document.getElementById('mpm-model-search');
      if (searchInput) searchInput.value = '';
      document.getElementById('mpm-discovered-list').innerHTML = '';
      document.getElementById('mpm-btn-add-selected').style.display = 'none';
      document.getElementById('mpm-fetch-status').innerText = 'Consultando catálogo e API...';
      document.getElementById('mpm-manual-name').value = '';

      document.getElementById('modal-provider-models').classList.add('active');

      // Auto-busca imediata ao abrir o modal para experiência fluida
      fetchAvailableModels();
    }

    function closeProviderModelsModal() {
      document.getElementById('modal-provider-models').classList.remove('active');
    }

    function renderActiveModelsList() {
      var p = (window._providersData || []).find(function(x) { return x.id === activeModalProviderId; });
      var container = document.getElementById('mpm-active-list');
      var countEl = document.getElementById('mpm-active-count');
      if (!container) return;
      container.innerHTML = '';
      var models = (p && p.models) ? p.models : [];
      if (countEl) countEl.innerText = models.length + ' ativo(s)';
      if (models.length === 0) {
        container.innerHTML = '<span style="color:var(--text-muted); font-size:0.8rem;">Nenhum modelo cadastrado. Adicione abaixo!</span>';
        return;
      }
      models.forEach(function(m) {
        var tag = document.createElement('span');
        tag.className = 'model-tag';
        tag.innerHTML =
          '<span style="user-select:all; cursor:text;">' + escapeHtml(m) + '</span>' +
          '<button type="button" class="copy-icon-btn" title="Copiar modelo" style="background:none; border:none; cursor:pointer; font-size:0.75rem; padding:0 0.15rem; color:#fff;" onclick="event.stopPropagation(); navigator.clipboard.writeText(&apos;' + escapeHtml(m) + '&apos;).then(function(){ showToast(&apos;Modelo copiado!&apos;, &apos;success&apos;); });">📋</button>' +
          '<span class="remove-btn" title="Remover modelo" onclick="removeModelFromActiveProvider(&apos;' + escapeHtml(m) + '&apos;)">✕</span>';
        container.appendChild(tag);
      });
    }

    function filterDiscoveredModels() {
      var searchInput = document.getElementById('mpm-model-search');
      var search = (searchInput ? searchInput.value : '').toLowerCase().trim();
      var items = document.querySelectorAll('#mpm-discovered-list .model-select-item');
      items.forEach(function(el) {
        var text = el.getAttribute('data-model-name') || el.innerText.toLowerCase();
        if (!search || text.toLowerCase().includes(search)) {
          el.style.display = 'flex';
        } else {
          el.style.display = 'none';
        }
      });
    }

    function selectAllDiscoveredModels(check) {
      var checkboxes = document.querySelectorAll('.disc-model-cb:not(:disabled)');
      checkboxes.forEach(function(cb) {
        var parent = cb.closest('.model-select-item');
        if (!check || !parent || parent.style.display !== 'none') {
          cb.checked = check;
        }
      });
    }

    async function fetchAvailableModels() {
      if (!activeModalProviderId) return;
      var btn = document.getElementById('mpm-btn-fetch');
      var status = document.getElementById('mpm-fetch-status');
      var listContainer = document.getElementById('mpm-discovered-list');
      var addSelectedBtn = document.getElementById('mpm-btn-add-selected');

      var endpointInput = document.getElementById('mpm-endpoint-input');
      var endpointVal = endpointInput ? endpointInput.value.trim() : '';
      var keyInput = document.getElementById('mpm-key-input');
      var keyVal = keyInput ? keyInput.value.trim() : '';

      if (btn) {
        btn.disabled = true;
        btn.innerText = 'Buscando...';
      }
      if (status) status.innerText = 'Consultando API oficial e catálogo de modelos...';
      if (listContainer) listContainer.innerHTML = '';
      if (addSelectedBtn) addSelectedBtn.style.display = 'none';

      try {
        var res = await adminFetch('/api/admin/providers/' + activeModalProviderId + '/fetch-models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: keyVal || undefined,
            baseUrl: endpointVal || undefined
          })
        });
        var data = await res.json();
        if (btn) {
          btn.disabled = false;
          btn.innerText = '🔄 Recarregar';
        }

        if (data.ok && data.models && data.models.length > 0) {
          var p = (window._providersData || []).find(function(x) { return x.id === activeModalProviderId; });
          var activeSet = new Set((p && p.models) ? p.models : []);

          if (status) {
            if (data.hasUpstream) {
              status.innerHTML = '<span style="color:var(--emerald); font-weight:600;">✓ ' + data.upstreamCount + ' modelos retornados pela API oficial!</span>';
            } else if (data.fetchError) {
              status.innerHTML = '<span style="color:var(--amber); font-weight:500;">Catálogo ativo (' + escapeHtml(data.fetchError) + ')</span>';
            } else {
              status.innerHTML = '<span style="color:var(--amber);">Catálogo de modelos recomendados para este provedor.</span>';
            }
          }

          data.models.forEach(function(m) {
            var isAlreadyActive = activeSet.has(m);
            var item = document.createElement('div');
            item.className = 'model-select-item';
            item.setAttribute('data-model-name', m);
            item.innerHTML =
              '<div style="display:flex; align-items:center; gap:0.5rem; overflow:hidden;">' +
                '<input type="checkbox" class="disc-model-cb" value="' + escapeHtml(m) + '" ' + (isAlreadyActive ? 'checked disabled' : '') + ' style="cursor:pointer; flex-shrink:0;" />' +
                '<span class="model-select-name" style="font-family:monospace; font-size:0.8rem; word-break:break-all; user-select:all; cursor:text;">' + escapeHtml(m) + '</span>' +
                '<button type="button" class="copy-icon-btn" title="Copiar identificador do modelo" style="background:none; border:none; cursor:pointer; font-size:0.8rem; padding:0 0.2rem;" onclick="event.stopPropagation(); navigator.clipboard.writeText(&apos;' + escapeHtml(m) + '&apos;).then(function(){ showToast(&apos;Modelo copiado!&apos;, &apos;success&apos;); });">📋</button>' +
              '</div>' +
              '<div style="display:flex; align-items:center; gap:0.35rem; flex-shrink:0;">' +
                '<button type="button" class="btn btn-secondary" style="padding:0.2rem 0.45rem; font-size:0.68rem;" onclick="testSingleModel(&apos;' + escapeHtml(m) + '&apos;)">⚡ Testar</button>' +
                (isAlreadyActive ? '<span style="font-size:0.72rem; color:var(--emerald); font-weight:600; padding:0 0.25rem;">ativo</span>' : '<button type="button" class="btn btn-secondary" style="padding:0.2rem 0.5rem; font-size:0.7rem;" onclick="quickAddSingleModel(&apos;' + escapeHtml(m) + '&apos;)">+ Adicionar</button>') +
              '</div>';
            listContainer.appendChild(item);
          });

          if (addSelectedBtn) addSelectedBtn.style.display = 'inline-block';
          filterDiscoveredModels();
        } else {
          if (status) status.innerText = 'Nenhum modelo novo encontrado. ' + (data.fetchError ? 'Nota: ' + data.fetchError : '');
        }
      } catch (e) {
        if (btn) {
          btn.disabled = false;
          btn.innerText = '🔄 Recarregar';
        }
        if (status) status.innerText = 'Erro ao buscar modelos: ' + e.message;
      }
    }

    async function testSingleModel(modelName) {
      if (!activeModalProviderId || !modelName) return;
      var itemEl = document.querySelector('#mpm-discovered-list .model-select-item[data-model-name="' + modelName + '"]');
      var oldBadge = itemEl ? itemEl.querySelector('.model-test-badge') : null;
      if (oldBadge) oldBadge.remove();

      var badge = document.createElement('span');
      badge.className = 'model-test-badge badge-latency';
      badge.style.fontSize = '0.7rem';
      badge.style.marginLeft = '0.4rem';
      badge.innerText = '⏳...';
      if (itemEl) itemEl.appendChild(badge);

      showToast('Testando ' + modelName + '...', 'info');

      var endpointInput = document.getElementById('mpm-endpoint-input');
      var endpointVal = endpointInput ? endpointInput.value.trim() : '';
      var keyInput = document.getElementById('mpm-key-input');
      var keyVal = keyInput ? keyInput.value.trim() : '';

      try {
        var res = await adminFetch('/api/admin/providers/' + activeModalProviderId + '/test-models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: keyVal || undefined,
            baseUrl: endpointVal || undefined,
            models: [modelName]
          })
        });
        var data = await res.json();
        var r = data.results && data.results[0];
        if (r) {
          badge.className = 'model-test-badge badge-latency ' + (r.success ? 'ok' : 'err');
          if (r.success) {
            badge.innerText = '⚡ ' + r.latency_ms + 'ms · OK';
            showToast('✅ ' + modelName + ' respondeu em ' + r.latency_ms + 'ms!', 'success');
          } else {
            var labelMap = {
              ok: 'OK',
              modelo_inexistente: 'Inexistente (404)',
              sem_acesso: 'Sem Acesso (401)',
              cota_esgotada: 'Cota/Rate-limit (429)',
              precisa_pago: 'Requer Pago (402)',
              timeout: 'Timeout',
              outro_erro: 'Falhou (' + r.status + ')'
            };
            var errBrief = (r.classification && labelMap[r.classification]) || (r.status === 401 ? 'Sem Chave' : 'Falhou (' + r.status + ')');
            badge.innerText = '❌ ' + errBrief;
            badge.title = r.error || 'Falha no teste';
            showToast('❌ ' + modelName + ': ' + (r.error || errBrief), 'error');
          }
        } else {
          badge.remove();
          showToast('❌ Sem resposta do teste', 'error');
        }
      } catch (e) {
        if (badge) badge.remove();
        showToast('Erro: ' + e.message, 'error');
      }
    }

    async function testProviderModels() {
      if (!activeModalProviderId) return;
      var btn = document.getElementById('mpm-btn-test');
      var originalText = btn ? btn.innerText : '⚡ Testar Modelos';
      if (btn) {
        btn.disabled = true;
        btn.innerText = '⏳ Testando...';
      }
      showToast('Testando modelos do provedor ' + activeModalProviderId + '...', 'info');

      var endpointInput = document.getElementById('mpm-endpoint-input');
      var endpointVal = endpointInput ? endpointInput.value.trim() : '';
      var keyInput = document.getElementById('mpm-key-input');
      var keyVal = keyInput ? keyInput.value.trim() : '';

      var discoveredEls = document.querySelectorAll('#mpm-discovered-list .model-select-item');
      var modalModelNames = Array.from(discoveredEls).map(function(el) { return el.getAttribute('data-model-name'); }).filter(Boolean);

      try {
        var res = await adminFetch('/api/admin/providers/' + activeModalProviderId + '/test-models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: keyVal || undefined,
            baseUrl: endpointVal || undefined,
            models: modalModelNames.length > 0 ? modalModelNames.slice(0, 12) : undefined
          })
        });
        var data = await res.json();
        if (btn) {
          btn.disabled = false;
          btn.innerText = originalText;
        }

        if (data.ok && data.results && data.results.length > 0) {
          var okCount = 0;
          data.results.forEach(function(r) {
            if (r.success) okCount++;
            var itemEl = document.querySelector('#mpm-discovered-list .model-select-item[data-model-name="' + r.model + '"]');
            if (itemEl) {
              var oldBadge = itemEl.querySelector('.model-test-badge');
              if (oldBadge) oldBadge.remove();
              var badge = document.createElement('span');
              badge.className = 'model-test-badge badge-latency ' + (r.success ? 'ok' : 'err');
              badge.style.fontSize = '0.7rem';
              badge.style.marginLeft = '0.4rem';
              if (r.success) {
                badge.innerText = '⚡ ' + r.latency_ms + 'ms · OK';
              } else {
                var labelMap = {
                  ok: 'OK',
                  modelo_inexistente: 'Inexistente (404)',
                  sem_acesso: 'Sem Acesso (401)',
                  cota_esgotada: 'Cota/Rate-limit (429)',
                  precisa_pago: 'Requer Pago (402)',
                  timeout: 'Timeout',
                  outro_erro: 'Falhou (' + r.status + ')'
                };
                var errBrief = (r.classification && labelMap[r.classification]) || (r.status === 401 ? 'Sem Chave' : 'Falhou (' + r.status + ')');
                badge.innerText = '❌ ' + errBrief;
                badge.title = r.error || 'Falha no teste';
              }
              itemEl.appendChild(badge);
            }
          });

          if (okCount > 0) {
            showToast('✅ ' + okCount + '/' + data.results.length + ' modelo(s) responderam com sucesso!', 'success');
          } else {
            var firstErr = (data.results[0] && data.results[0].error) ? data.results[0].error : (data.results[0] && data.results[0].status === 401 ? 'Chave de API não configurada' : 'Falha ao testar modelos');
            showToast('❌ Falha nos testes: ' + firstErr, 'error');
          }
        } else {
          var errMsg = (data.error && data.error.message) ? data.error.message : (data.message || 'Nenhum resultado de teste retornado');
          showToast('❌ ' + errMsg, 'error');
        }
      } catch (e) {
        if (btn) {
          btn.disabled = false;
          btn.innerText = originalText;
        }
        showToast('Erro ao testar modelos: ' + e.message, 'error');
      }
    }

    async function quickAddSingleModel(modelName) {
      if (!activeModalProviderId || !modelName) return;
      try {
        var res = await adminFetch('/api/admin/providers/' + activeModalProviderId + '/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: modelName })
        });
        var data = await res.json();
        if (data.ok) {
          showToast('Modelo "' + modelName + '" adicionado com sucesso!', 'success');
          var p = (window._providersData || []).find(function(x) { return x.id === activeModalProviderId; });
          if (p) {
            p.models = Array.from(new Set([...(p.models || []), modelName]));
          }
          renderActiveModelsList();
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

    async function addAllDiscoveredModels() {
      if (!activeModalProviderId) return;
      var checkboxes = document.querySelectorAll('.disc-model-cb:not(:disabled)');
      var selected = [];
      checkboxes.forEach(function(cb) { selected.push(cb.value); });
      if (selected.length === 0) { showToast('Nenhum modelo novo para adicionar.', 'info'); return; }
      try {
        var res = await adminFetch('/api/admin/providers/' + activeModalProviderId + '/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ models: selected })
        });
        var data = await res.json();
        if (data.ok) {
          showToast(selected.length + ' modelo(s) adicionado(s) com sucesso!', 'success');
          var p = (window._providersData || []).find(function(x) { return x.id === activeModalProviderId; });
          if (p) p.models = Array.from(new Set([...(p.models || []), ...selected]));
          renderActiveModelsList();
          await loadAdmin();
          renderActiveModelsList();
          fetchAvailableModels();
        } else {
          showToast('Erro ao adicionar modelos: ' + JSON.stringify(data.error || data), 'error');
        }
      } catch (e) { showToast('Erro: ' + e.message, 'error'); }
    }

    async function addSelectedDiscoveredModels() {
      if (!activeModalProviderId) return;
      var checkboxes = document.querySelectorAll('.disc-model-cb:checked:not(:disabled)');
      var selected = [];
      checkboxes.forEach(function(cb) { selected.push(cb.value); });

      if (selected.length === 0) {
        showToast('Selecione ao menos um modelo novo para adicionar.', 'info');
        return;
      }

      try {
        var res = await adminFetch('/api/admin/providers/' + activeModalProviderId + '/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ models: selected })
        });
        var data = await res.json();
        if (data.ok) {
          showToast(selected.length + ' modelo(s) adicionado(s) com sucesso!', 'success');
          var p = (window._providersData || []).find(function(x) { return x.id === activeModalProviderId; });
          if (p) {
            p.models = Array.from(new Set([...(p.models || []), ...selected]));
          }
          renderActiveModelsList();
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
      var input = document.getElementById('mpm-manual-name');
      var name = input ? input.value.trim() : '';
      if (!name) {
        showToast('Digite o nome do modelo a adicionar.', 'error');
        return;
      }
      try {
        var res = await adminFetch('/api/admin/providers/' + activeModalProviderId + '/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: name })
        });
        var data = await res.json();
        if (data.ok) {
          showToast('Modelo "' + name + '" adicionado com sucesso!', 'success');
          if (input) input.value = '';
          var p = (window._providersData || []).find(function(x) { return x.id === activeModalProviderId; });
          if (p) {
            p.models = Array.from(new Set([...(p.models || []), name]));
          }
          renderActiveModelsList();
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

    async function removeModelFromActiveProvider(modelName) {
      if (!activeModalProviderId || !modelName) return;
      if (!confirm('Remover o modelo "' + modelName + '" deste provedor?')) return;
      try {
        // Atualização otimista: remove do estado local imediatamente para refletir na interface
        var p = (window._providersData || []).find(function(x) { return x.id === activeModalProviderId; });
        if (p && p.models) {
          p.models = p.models.filter(function(m) { return m !== modelName; });
        }
        renderActiveModelsList();

        var res = await adminFetch('/api/admin/providers/' + activeModalProviderId + '/models', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: modelName })
        });
        var data = await res.json();
        if (data.ok) {
          showToast('Modelo "' + modelName + '" removido com sucesso!', 'info');
          await loadAdmin();
          renderActiveModelsList();
          // Atualiza lista de descobertos se estiver visível
          var discItem = document.querySelector('#mpm-discovered-list .model-select-item[data-model-name="' + CSS.escape(modelName) + '"]');
          if (discItem) {
            var cb = discItem.querySelector('.disc-model-cb');
            if (cb) { cb.disabled = false; cb.checked = false; }
            var statusSpan = discItem.querySelector('span[style*="var(--emerald)"]');
            if (statusSpan) {
              statusSpan.outerHTML = '<button type="button" class="btn btn-secondary" style="padding:0.2rem 0.5rem; font-size:0.7rem; flex-shrink:0;" data-model-name="' + escapeHtml(modelName) + '" onclick="quickAddSingleModel(this.dataset.modelName)">+ Adicionar</button>';
            }
          }
        } else {
          showToast('Erro ao remover modelo: ' + JSON.stringify(data.error || data), 'error');
          await loadAdmin();
          renderActiveModelsList();
        }
      } catch (e) {
        showToast('Erro: ' + e.message, 'error');
        await loadAdmin();
        renderActiveModelsList();
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

    async function addCustomProvider(providerIdOverride) {
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
        id: providerIdOverride || undefined,
        name: name,
        baseUrl: baseUrl,
        protocol: protocol,
        apiKeys: keysStr ? keysStr.split(/[\\n,]+/).map(function(s){return s.trim();}).filter(Boolean) : [],
        models: modelsStr ? modelsStr.split(/[\\n,]+/).map(function(s){return s.trim();}).filter(Boolean) : [],
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
          html += '<div class="admin-model-result">' +
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
            '<div style="display:flex; gap:0.4rem; margin-top:0.5rem; flex-wrap:wrap;">' +
              '<button class="btn btn-secondary" style="padding:0.35rem 0.6rem; font-size:0.75rem;" onclick="applyPreset(&apos;' + escapeHtml(p.id) + '&apos;)">⚡ Usar Template</button>' +
              '<button class="btn btn-secondary" style="padding:0.35rem 0.6rem; font-size:0.75rem; color:var(--primary);" onclick="usePresetAndSearchModels(&apos;' + escapeHtml(p.id) + '&apos;)">🔍 Buscar Modelos</button>' +
            '</div>';
          grid.appendChild(box);
        });
        window._presetsData = data.presets || [];
      } catch (e) {
        grid.innerHTML = '<span style="color:var(--rose);">Erro ao carregar templates: ' + e.message + '</span>';
      }
    }

    async function usePresetAndSearchModels(presetId) {
      const preset = (window._presetsData || []).find(function(x) { return x.id === presetId; });
      if (!preset) return;
      let provider = (window._providersData || []).find(function(x) { return x.id === preset.id; });
      if (provider) {
        // Provedor já existe nativamente: abre diretamente o modal de modelos
        openProviderModelsModal(provider.id);
        return;
      }
      applyPreset(presetId);
      const keyValue = document.getElementById('acp-keys').value.trim();
      if (!keyValue && preset.id !== 'cloudflare-ai') {
        showToast('Template aplicado. Informe a chave e clique novamente em Buscar Modelos.', 'info');
        document.getElementById('acp-keys').focus();
        return;
      }
      await addCustomProvider(preset.id);
      provider = (window._providersData || []).find(function(x) { return x.id === preset.id; });
      if (provider) openProviderModelsModal(provider.id);
    }

    function applyPreset(presetId) {
      const p = (window._presetsData || []).find(function(x) { return x.id === presetId; });
      if (!p) return;
      const existing = (window._providersData || []).find(function(x) { return x.id === p.id; });
      if (existing) {
        showToast('Provedor "' + p.name + '" já está configurado na sua lista. Abrindo chaves...', 'info');
        openProviderKeysModal(existing.id);
        return;
      }
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
          if (cfg.firecrawlApiKey) document.getElementById('adm-search-firecrawl').value = cfg.firecrawlApiKey;
          if (cfg.exaApiKey) document.getElementById('adm-search-exa').value = cfg.exaApiKey;
          if (cfg.context7ApiKey) document.getElementById('adm-search-context7').value = cfg.context7ApiKey;
          if (cfg.linkupApiKey) document.getElementById('adm-search-linkup').value = cfg.linkupApiKey;
          if (cfg.searchapiApiKey) document.getElementById('adm-search-searchapi').value = cfg.searchapiApiKey;
          if (cfg.ydcApiKey) document.getElementById('adm-search-ydc').value = cfg.ydcApiKey;
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
      const firecrawlApiKey = document.getElementById('adm-search-firecrawl').value.trim();
      const exaApiKey = document.getElementById('adm-search-exa').value.trim();
      const context7ApiKey = document.getElementById('adm-search-context7').value.trim();
      const linkupApiKey = document.getElementById('adm-search-linkup').value.trim();
      const searchapiApiKey = document.getElementById('adm-search-searchapi').value.trim();
      const ydcApiKey = document.getElementById('adm-search-ydc').value.trim();

      try {
        const res = await adminFetch('/api/admin/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ engine, searxngUrl, serperApiKey, braveApiKey, tavilyApiKey, firecrawlApiKey, exaApiKey, context7ApiKey, linkupApiKey, searchapiApiKey, ydcApiKey })
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
            '<p style="margin:0.2rem 0 0 0; font-size:0.75rem; color:var(--text-muted);">' + escapeHtml(r.content || r.snippet || '') + '</p>' +
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
          item.style = 'display:flex; justify-content:space-between; align-items:center; padding:0.65rem 0.85rem; background:rgba(255,255,255,0.03); border:1px solid var(--card-border); border-radius:8px; gap:0.5rem; flex-wrap:wrap;';
          item.innerHTML =
            '<div>' +
              '<div style="font-weight:600; font-size:0.85rem; display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">' +
                '<span>' + escapeHtml(k.name) + '</span>' +
                '<span style="font-family:monospace; color:var(--primary); font-size:0.8rem; background:rgba(56,189,248,0.1); padding:0.15rem 0.45rem; border-radius:4px; cursor:pointer;" title="Clique para copiar" onclick="navigator.clipboard.writeText(&apos;' + escapeHtml(k.key || k.id) + '&apos;); showToast(&apos;Chave copiada!&apos;, &apos;success&apos;);">' + escapeHtml(k.key || k.id) + ' 📋</span>' +
              '</div>' +
              '<div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">Requisições: <strong>' + (k.totalRequests || k.requestsCount || 0) + '</strong> · Criada em: ' + escapeHtml(k.createdAt ? k.createdAt.substring(0, 10) : '') + '</div>' +
            '</div>' +
            '<div style="display:flex; gap:0.4rem;">' +
              '<button type="button" class="btn btn-secondary" style="padding:0.3rem 0.65rem; font-size:0.75rem;" onclick="navigator.clipboard.writeText(&apos;' + escapeHtml(k.key || k.id) + '&apos;); showToast(&apos;Chave copiada com sucesso!&apos;, &apos;success&apos;);">📋 Copiar</button>' +
              '<button type="button" class="btn btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.75rem; background:rgba(244,63,94,0.15); color:var(--rose);" onclick="deleteVirtualKey(&apos;' + escapeHtml(k.id) + '&apos;)">Revogar</button>' +
            '</div>';
          list.appendChild(item);
        });
      } catch (e) {
        list.innerHTML = '<span style="color:var(--rose);">Erro ao carregar chaves: ' + e.message + '</span>';
      }
    }

    function showKeySuccessModal(keyVal) {
      const modal = document.getElementById('modal-key-success');
      const input = document.getElementById('mks-key-input');
      const baseEl = document.getElementById('mks-baseurl');
      if (input) input.value = keyVal;
      if (baseEl) baseEl.innerText = window.location.origin + '/v1';
      if (modal) modal.classList.add('active');
      setTimeout(function() {
        if (input) {
          input.focus();
          input.select();
        }
      }, 150);
    }

    function closeKeySuccessModal() {
      const modal = document.getElementById('modal-key-success');
      if (modal) modal.classList.remove('active');
    }

    async function copyKeySuccessValue() {
      const input = document.getElementById('mks-key-input');
      const btn = document.getElementById('mks-copy-btn');
      if (!input || !input.value) return;
      try {
        await navigator.clipboard.writeText(input.value);
        if (btn) {
          btn.innerText = '✓ Copiado!';
          btn.style.background = 'var(--emerald)';
          setTimeout(function() {
            btn.innerText = '📋 Copiar';
            btn.style.background = '';
          }, 2000);
        }
        showToast('Chave copiada para a área de transferência!', 'success');
      } catch (e) {
        input.select();
        document.execCommand('copy');
        showToast('Chave copiada!', 'success');
      }
    }

    async function createVirtualKey() {
      const name = document.getElementById('adm-vkey-name').value.trim();
      if (!name) return showToast('Informe o nome do cliente ou IDE', 'error');
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
          showKeySuccessModal(data.key.key || data.key.id);
          showToast('Chave virtual criada com sucesso!', 'success');
        } else {
          showToast('Erro ao criar chave: ' + JSON.stringify(data.error || data), 'error');
        }
      } catch (e) {
        showToast('Erro: ' + e.message, 'error');
      }
    }

    async function deleteVirtualKey(id) {
      if (!confirm('Revogar esta chave virtual permanentemente? Clientes que a utilizam perderão o acesso.')) return;
      try {
        const res = await adminFetch('/api/admin/virtual-keys/' + id, { method: 'DELETE' });
        const data = await res.json();
        if (data.ok) {
          showToast('Chave virtual revogada com sucesso.', 'info');
          loadVirtualKeys();
        } else {
          showToast('Erro ao revogar chave: ' + JSON.stringify(data.error || data), 'error');
        }
      } catch (e) {
        showToast('Erro: ' + e.message, 'error');
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
      
      if (authBtn) {
        authBtn.href = '/api/oauth/antigravity/authorize?token=' + encodeURIComponent(getAdminToken());
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
          detail.innerHTML = 'Client ID ativo (' + escapeHtml(data.maskedClientId || 'embutido') + ')' +
            (data.hasTokens ? ' · <strong style="color:var(--emerald);">Tokens Ativos no KV</strong>' : ' · <span style="color:var(--amber);">Aguardando Autorização</span>');
        } else {
          badge.innerText = 'Credenciais Pendentes';
          badge.style.background = 'rgba(245,158,11,0.15)';
          badge.style.color = 'var(--amber)';
          badge.style.borderColor = 'rgba(245,158,11,0.3)';
          detail.innerHTML = 'Client ID não configurado no código.';
        }
      } catch (e) {
        if (badge) badge.innerText = 'Erro ao verificar';
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
                '<span class="badge-edge" style="font-family:monospace; background:rgba(56,189,248,0.15); color:var(--primary); cursor:pointer;" title="Clique para copiar" data-copy="' + escapeHtml(c.id) + '" onclick="navigator.clipboard.writeText(this.dataset.copy); showToast(&apos;Copiado: &apos; + this.dataset.copy, &apos;success&apos;);">' +
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
              '<button class="btn btn-secondary" style="padding:0.35rem 0.75rem; font-size:0.78rem;" data-combo-id="' + escapeHtml(c.id) + '" onclick="testComboCascade(this.dataset.comboId)">🌊 Testar Cascata</button>' +
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
        else showToast('Erro: ' + JSON.stringify(data), 'error');
      } catch (e) {
        showToast('Erro: ' + e.message, 'error');
      }
    }

    async function testCombo(comboId) {
      const c = currentCombos[comboId];
      if (!c || !c.targets || c.targets.length === 0) return showToast('Este combo não possui modelos para testar.', 'info');

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
                let errMsg = r.status === 401 ? 'Falta Chave/Inválida' : (r.status || 'Erro');
                badge.innerText = '❌ ' + errMsg + (r.latency_ms ? ' (' + r.latency_ms + 'ms)' : '');
                badge.title = r.error || 'Falha no teste';
              }
            }
          });
        }
      } catch (e) {
        showToast('Erro ao executar testes: ' + e.message, 'error');
      }
    }

    async function testComboCascade(comboId) {
      showToast('Testando roteamento da cascata ' + comboId + '...', 'info');
      try {
        const start = Date.now();
        const res = await adminFetch('/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: comboId,
            messages: [{ role: 'user', content: 'Respond exactly with the word OK and nothing else.' }],
            max_tokens: 5
          })
        });
        const latency = Date.now() - start;
        if (res.ok) {
          const data = await res.json();
          showToast('✅ Cascata OK (' + latency + 'ms). Resposta: ' + (data.choices?.[0]?.message?.content || ''), 'success');
        } else {
          const err = await res.text();
          showToast('❌ Cascata falhou (' + res.status + ') - Nenhuma chave de API configurada funcionou.', 'error');
        }
      } catch (e) {
        showToast('Erro de rede: ' + e.message, 'error');
      }
    }

    async function testAllCombos() {
      const comboIds = Object.keys(currentCombos);
      if (comboIds.length === 0) return showToast('Nenhum combo para testar.', 'info');
      for (let i = 0; i < comboIds.length; i++) {
        await testCombo(comboIds[i]);
      }
    }

    // Inicialização
    const urlParams = new URLSearchParams(window.location.search);
    const initialTab = urlParams.get('tab') || window.location.hash.replace('#tab-', '') || 'overview';
    updateAdminAuthHeaderStatus();
    if (initialTab && initialTab !== 'overview') {
      showTab(initialTab);
    } else {
      if (getAdminToken()) {
        loadCombos();
        loadAdmin();
        populatePlaygroundModels();
      }
    }
  </script>
</body>
</html>`;
}
