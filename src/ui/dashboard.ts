/**
 * VeroRoute Edge — Central Web & Documentação Interativa
 * Servida diretamente pelo Cloudflare Worker
 */

import { UI_STYLES } from "./styles";
import { renderOverviewSection } from "./sections/overview";
import { renderDocsSection } from "./sections/docs";
import { renderDeploymentSection } from "./sections/deployment";
import { renderFaqSection } from "./sections/faq";
import { renderApiReferenceSection } from "./sections/apiReference";
import { renderProvidersSection } from "./sections/providers";
import {
  renderSearchSection,
  renderAntigravitySection,
  renderCombosSection,
  renderPlaygroundSection,
  renderAdminSection,
  renderComboModal,
} from "./sections/admin";
import { renderClientScripts } from "./clientScripts";

export function renderDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VeroRoute Edge — Serverless AI Gateway & Smart Cascade Router</title>
  <meta name="description" content="Gateway de Inteligência Artificial Serverless nativo para Cloudflare Workers. Roteamento em cascata, emulação universal de tool calling, fallback automático e cache na borda.">
  <link rel="icon" type="image/png" href="https://cdn.inglescurso.org/file/1bcQSpD9hFiY_mSP8ZwmdynzrWz1kDijY/veroroute-edge_1788803925.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    ${UI_STYLES}
  </style>
</head>
<body>

  <!-- CABEÇALHO GLOBAL COM LOGO OFICIAL -->
  <header>
    <a href="#overview" class="brand-wrapper" onclick="showTab('overview'); return false;">
      <div class="brand-logo-container">
        <img 
          src="https://cdn.inglescurso.org/file/1bcQSpD9hFiY_mSP8ZwmdynzrWz1kDijY/veroroute-edge_1788803925.png" 
          alt="VeroRoute Edge Logo" 
          class="brand-logo"
          loading="eager"
        />
      </div>
      <div class="brand-info">
        <span class="brand-title">VeroRoute Edge</span>
        <span class="brand-subtitle">Serverless Gateway</span>
      </div>
    </a>

    <!-- MENU DESKTOP -->
    <nav class="nav-desktop">
      <button class="nav-btn active" data-tab="overview" onclick="showTab('overview')">
        ⚡ Visão Geral
      </button>
      <button class="nav-btn" data-tab="docs" onclick="showTab('docs')">
        📖 Documentação
      </button>
      <button class="nav-btn" data-tab="deploy" onclick="showTab('deploy')">
        🚀 Deploy & Domínio
      </button>
      <button class="nav-btn" data-tab="faq" onclick="showTab('faq')">
        ❓ FAQ & Erros
      </button>
      <button class="nav-btn" data-tab="providers" onclick="showTab('providers')">
        🌐 Provedores
      </button>
      <button class="nav-btn" data-tab="api" onclick="showTab('api')">
        🔌 API & Clientes
      </button>
      <button class="nav-btn" data-tab="search" onclick="showTab('search')">
        🔍 Busca Web
      </button>
      <button class="nav-btn" data-tab="combos" onclick="showTab('combos')">
        🔀 Combos
      </button>
      <button class="nav-btn" data-tab="playground" onclick="showTab('playground')">
        🧪 Playground
      </button>
      <button class="nav-btn nav-admin" data-tab="admin" onclick="showTab('admin')">
        ⚙️ Administração
      </button>
    </nav>

    <!-- AÇÕES RÁPIDAS -->
    <div class="header-actions">
      <button class="btn btn-secondary btn-sm" onclick="copyBaseUrl()" title="Copiar Base URL">
        📋 Base URL
      </button>
      <a href="https://github.com/samucamg/veroroute-edge" target="_blank" rel="noopener noreferrer" class="github-badge-btn" title="Ver código no GitHub">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        <span>GitHub</span>
      </a>
      <button class="mobile-menu-btn" onclick="toggleMobileMenu()" aria-label="Menu">
        ☰
      </button>
    </div>
  </header>

  <!-- MENU MOBILE DRAWER -->
  <div id="mobile-drawer" class="mobile-drawer">
    <button class="nav-btn" data-tab="overview" onclick="showTab('overview')">⚡ Visão Geral</button>
    <button class="nav-btn" data-tab="docs" onclick="showTab('docs')">📖 Documentação Completa</button>
    <button class="nav-btn" data-tab="deploy" onclick="showTab('deploy')">🚀 Deploy & Subdomínio</button>
    <button class="nav-btn" data-tab="faq" onclick="showTab('faq')">❓ FAQ & Solução de Erros</button>
    <button class="nav-btn" data-tab="providers" onclick="showTab('providers')">🌐 Provedores & Modelos</button>
    <button class="nav-btn" data-tab="api" onclick="showTab('api')">🔌 Clientes & Integração</button>
    <button class="nav-btn" data-tab="search" onclick="showTab('search')">🔍 Busca Web & RAG</button>
    <button class="nav-btn" data-tab="combos" onclick="showTab('combos')">🔀 Combos de Roteamento</button>
    <button class="nav-btn" data-tab="playground" onclick="showTab('playground')">🧪 Playground de Testes</button>
    <button class="nav-btn nav-admin" data-tab="admin" onclick="showTab('admin')">⚙️ Administração</button>
    <a href="https://github.com/samucamg/veroroute-edge" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="margin-top:0.75rem;">
      Ver Repositório no GitHub
    </a>
  </div>

  <!-- CONTEÚDO PRINCIPAL -->
  <main>
    ${renderOverviewSection()}
    ${renderDocsSection()}
    ${renderDeploymentSection()}
    ${renderFaqSection()}
    ${renderProvidersSection()}
    ${renderApiReferenceSection()}
    ${renderSearchSection()}
    ${renderAntigravitySection()}
    ${renderCombosSection()}
    ${renderPlaygroundSection()}
    ${renderAdminSection()}
  </main>

  <!-- MODAL DE COMBO -->
  ${renderComboModal()}

  <!-- TOAST DE NOTIFICAÇÃO -->
  <div id="toast-notice" class="toast-notice"></div>

  <!-- RODAPÉ -->
  <footer>
    <div style="display:flex; align-items:center; gap:0.6rem;">
      <img 
        src="https://cdn.inglescurso.org/file/1bcQSpD9hFiY_mSP8ZwmdynzrWz1kDijY/veroroute-edge_1788803925.png" 
        alt="VeroRoute Edge" 
        style="height: 22px; width: auto;"
      />
      <span style="font-weight: 600; color: #fff;">VeroRoute Edge v1.0.0</span>
      <span>— Serverless AI Gateway na Edge</span>
    </div>
    <div class="footer-links">
      <a href="https://github.com/samucamg/veroroute-edge" target="_blank" rel="noopener noreferrer" class="footer-link">GitHub</a>
      <a href="https://github.com/samucamg/veroroute-edge/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" class="footer-link">Licença MIT</a>
      <a href="https://developers.cloudflare.com/workers/" target="_blank" rel="noopener noreferrer" class="footer-link">Cloudflare Workers</a>
      <a href="#tab-deploy" onclick="showTab('deploy')" class="footer-link">veroroute.24hs.eu.org</a>
    </div>
    <p style="font-size: 0.78rem; color: var(--text-muted);">
      Desenvolvido por Samuel Santos (<a href="https://github.com/samucamg" target="_blank" style="color: var(--primary);">@samucamg</a>). Roteamento inteligente de IA 100% serverless.
    </p>
  </footer>

  <!-- SCRIPTS CLIENT-SIDE -->
  ${renderClientScripts()}
</body>
</html>`;
}
