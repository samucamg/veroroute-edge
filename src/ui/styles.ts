/**
 * VeroRoute Edge — Folha de Estilos Unificada (CSS Vanilla)
 * Design System Moderno: Glassmorphism, Dark Mode, Acentos Ciano/Teal alinhados com a Logo
 */

export const UI_STYLES = `
:root {
  --bg: #070b14;
  --bg-gradient: radial-gradient(circle at 50% 0%, #0d1b38 0%, #060912 100%);
  --card-bg: rgba(13, 22, 41, 0.72);
  --card-border: rgba(56, 189, 248, 0.14);
  --card-hover: rgba(56, 189, 248, 0.22);
  --primary: #38bdf8;
  --primary-dark: #0e7488;
  --primary-glow: rgba(56, 189, 248, 0.3);
  --teal: #14b8a6;
  --teal-glow: rgba(20, 184, 166, 0.25);
  --accent: #818cf8;
  --emerald: #10b981;
  --emerald-glow: rgba(16, 185, 129, 0.2);
  --amber: #f59e0b;
  --rose: #f43f5e;
  --text: #f8fafc;
  --text-muted: #94a3b8;
  --code-bg: #090e1c;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 18px;
  --radius-xl: 24px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg-gradient);
  background-attachment: fixed;
  color: var(--text);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  line-height: 1.6;
}

code, pre, .mono {
  font-family: 'JetBrains Mono', monospace, Consolas, Monaco;
}

/* Header & Top Navigation */
header {
  background: rgba(7, 11, 20, 0.88);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--card-border);
  padding: 0.65rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 200;
  gap: 1rem;
}

.brand-wrapper {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}

.brand-logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.brand-logo {
  height: 40px;
  width: auto;
  max-width: 48px;
  object-fit: contain;
  filter: drop-shadow(0 0 10px rgba(56, 189, 248, 0.45));
  transition: transform 0.25s ease, filter 0.25s ease;
  flex-shrink: 0;
}

.brand-wrapper:hover .brand-logo {
  transform: scale(1.06) rotate(-2deg);
  filter: drop-shadow(0 0 18px rgba(56, 189, 248, 0.85));
}

.brand-info {
  display: flex;
  flex-direction: column;
}

.brand-title {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, #ffffff 30%, #38bdf8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1.15;
}

.brand-subtitle {
  font-size: 0.72rem;
  color: var(--text-muted);
  letter-spacing: 0.5px;
  text-transform: uppercase;
  font-weight: 500;
}

.nav-desktop {
  display: flex;
  gap: 0.35rem;
  align-items: center;
  flex-wrap: wrap;
}

.nav-btn {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.45rem 0.85rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  text-decoration: none;
}

.nav-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

.nav-btn.active {
  color: var(--primary);
  background: rgba(56, 189, 248, 0.14);
  border-color: rgba(56, 189, 248, 0.35);
  box-shadow: 0 0 15px rgba(56, 189, 248, 0.2);
  font-weight: 600;
}

.nav-btn.nav-admin {
  border-color: rgba(129, 140, 248, 0.35);
  background: rgba(129, 140, 248, 0.12);
  color: #c7d2fe;
}

.nav-btn.nav-admin:hover {
  background: rgba(129, 140, 248, 0.25);
  color: #ffffff;
  box-shadow: 0 0 15px rgba(129, 140, 248, 0.3);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.github-badge-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.85rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-sm);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
  cursor: pointer;
}

.github-badge-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: var(--primary);
  color: var(--primary);
  box-shadow: 0 0 12px var(--primary-glow);
}

.mobile-menu-btn {
  display: none;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--card-border);
  color: var(--text);
  font-size: 1.25rem;
  width: 38px;
  height: 38px;
  border-radius: var(--radius-sm);
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* Mobile Drawer */
.mobile-drawer {
  position: fixed;
  top: 60px;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(7, 11, 20, 0.96);
  backdrop-filter: blur(24px);
  z-index: 190;
  padding: 1.5rem;
  display: none;
  flex-direction: column;
  gap: 0.6rem;
  overflow-y: auto;
  border-bottom: 1px solid var(--card-border);
}

.mobile-drawer.active {
  display: flex;
  animation: slideDown 0.25s ease;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Layout Principal */
main {
  flex: 1;
  max-width: 1240px;
  width: 100%;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
}

.tab-pane {
  display: none;
}

.tab-pane.active {
  display: block;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Hero Section */
.hero-container {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 2.5rem;
  align-items: center;
  padding: 2.5rem 0 3.5rem;
}

.hero-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.hero-pill-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.3);
  padding: 0.3rem 0.85rem;
  border-radius: 9999px;
  color: var(--primary);
  font-size: 0.8rem;
  font-weight: 600;
  width: fit-content;
}

.hero-pill-badge .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--emerald);
  box-shadow: 0 0 8px var(--emerald);
  animation: pulseDot 2s infinite;
}

@keyframes pulseDot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.6; }
}

.hero-title {
  font-size: 2.85rem;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -1.2px;
}

.hero-title span.highlight {
  background: linear-gradient(135deg, #38bdf8 0%, #818cf8 60%, #14b8a6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-description {
  font-size: 1.1rem;
  color: var(--text-muted);
  line-height: 1.6;
}

.hero-cta-group {
  display: flex;
  gap: 0.85rem;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 0.5rem;
}

.hero-visual {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.hero-logo-card {
  background: rgba(13, 22, 41, 0.7);
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: var(--radius-xl);
  padding: 2.5rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(56, 189, 248, 0.15);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  overflow: hidden;
  width: 100%;
  max-width: 440px;
}

.hero-logo-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 60%);
  pointer-events: none;
}

.hero-logo-img {
  width: 160px;
  height: 160px;
  object-fit: contain;
  filter: drop-shadow(0 0 25px rgba(56, 189, 248, 0.6));
  animation: floatSlow 4s ease-in-out infinite alternate;
  margin-bottom: 1.25rem;
}

@keyframes floatSlow {
  0% { transform: translateY(0px) rotate(0deg); }
  100% { transform: translateY(-8px) rotate(1deg); }
}

.hero-card-title {
  font-size: 1.35rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.hero-card-desc {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 1rem;
}

/* Cards & Containers */
.card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  padding: 1.75rem;
  margin-bottom: 1.75rem;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
  transition: border-color 0.25s, box-shadow 0.25s;
}

.card:hover {
  border-color: var(--card-hover);
}

.card-title {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.3px;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.card-subtitle {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin-bottom: 1.25rem;
}

/* Grids */
.grid-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: rgba(13, 22, 41, 0.65);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  padding: 1.25rem;
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s, border-color 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  border-color: var(--card-hover);
}

.stat-title {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 0.4rem;
  font-weight: 500;
}

.stat-val {
  font-size: 1.85rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.5px;
}

.stat-sub {
  font-size: 0.75rem;
  color: var(--emerald);
  margin-top: 0.35rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

/* Grid de Features & Cards Menores */
.grid-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

.feature-card {
  background: rgba(13, 22, 41, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-md);
  padding: 1.25rem;
  transition: all 0.2s;
}

.feature-card:hover {
  background: rgba(13, 22, 41, 0.85);
  border-color: var(--primary);
  box-shadow: 0 8px 24px rgba(56, 189, 248, 0.1);
}

.feature-icon {
  font-size: 1.6rem;
  margin-bottom: 0.6rem;
  display: inline-block;
}

.feature-title {
  font-size: 1.05rem;
  font-weight: 600;
  margin-bottom: 0.4rem;
}

.feature-desc {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.5;
}

/* Botões */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: #04101e;
  font-weight: 600;
  font-size: 0.9rem;
  padding: 0.65rem 1.25rem;
  border-radius: var(--radius-sm);
  border: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 15px rgba(56, 189, 248, 0.3);
  text-decoration: none;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 22px rgba(56, 189, 248, 0.45);
  filter: brightness(1.08);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  box-shadow: none;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: var(--primary);
  color: var(--primary);
  box-shadow: 0 0 15px rgba(56, 189, 248, 0.2);
}

.btn-sm {
  font-size: 0.78rem;
  padding: 0.35rem 0.75rem;
}

/* Code Blocks & Terminal */
.code-container {
  position: relative;
  background: var(--code-bg);
  border: 1px solid rgba(56, 189, 248, 0.16);
  border-radius: var(--radius-md);
  margin: 1rem 0 1.5rem;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 0.75rem;
  color: var(--text-muted);
}

.code-content {
  padding: 1rem 1.25rem;
  overflow-x: auto;
  font-size: 0.85rem;
  line-height: 1.5;
  color: #e2e8f0;
}

.copy-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-muted);
  font-size: 0.72rem;
  padding: 0.25rem 0.6rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: var(--primary);
  color: #000;
  border-color: var(--primary);
}

/* Alerts / Callouts */
.alert {
  border-radius: var(--radius-md);
  padding: 1rem 1.25rem;
  margin: 1rem 0;
  display: flex;
  gap: 0.85rem;
  align-items: flex-start;
  font-size: 0.88rem;
}

.alert-info {
  background: rgba(56, 189, 248, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #bae6fd;
}

.alert-success {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #a7f3d0;
}

.alert-warning {
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #fde68a;
}

.alert-danger {
  background: rgba(244, 63, 94, 0.08);
  border: 1px solid rgba(244, 63, 94, 0.3);
  color: #fecdd3;
}

/* Tabelas */
.table-responsive {
  width: 100%;
  overflow-x: auto;
  margin: 1rem 0 1.5rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--card-border);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  text-align: left;
}

th {
  background: rgba(255, 255, 255, 0.04);
  padding: 0.85rem 1rem;
  font-weight: 600;
  color: var(--primary);
  border-bottom: 1px solid var(--card-border);
  white-space: nowrap;
}

td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: #cbd5e1;
}

tr:last-child td {
  border-bottom: none;
}

tr:hover td {
  background: rgba(255, 255, 255, 0.02);
}

/* Badges & Tags */
.badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.badge-cyan {
  background: rgba(56, 189, 248, 0.15);
  color: var(--primary);
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.badge-green {
  background: rgba(16, 185, 129, 0.15);
  color: var(--emerald);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.badge-purple {
  background: rgba(129, 140, 248, 0.15);
  color: var(--accent);
  border: 1px solid rgba(129, 140, 248, 0.3);
}

.badge-amber {
  background: rgba(245, 158, 11, 0.15);
  color: var(--amber);
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.badge-red {
  background: rgba(244, 63, 94, 0.15);
  color: var(--rose);
  border: 1px solid rgba(244, 63, 94, 0.3);
}

/* Steps / Deploy Cards */
.steps-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin: 1.5rem 0;
}

.step-card {
  background: rgba(13, 22, 41, 0.55);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  padding: 1.25rem 1.5rem;
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
  transition: all 0.2s;
}

.step-card:hover {
  border-color: var(--primary);
  background: rgba(13, 22, 41, 0.8);
}

.step-number {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: #04101e;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 0 12px var(--primary-glow);
}

.step-body {
  flex: 1;
}

.step-title {
  font-size: 1.05rem;
  font-weight: 600;
  margin-bottom: 0.35rem;
}

/* FAQ Accordion */
.faq-item {
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  margin-bottom: 0.85rem;
  overflow: hidden;
  background: rgba(13, 22, 41, 0.5);
  transition: border-color 0.2s;
}

.faq-item:hover {
  border-color: var(--card-hover);
}

.faq-question {
  padding: 1.1rem 1.35rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 0.95rem;
  user-select: none;
}

.faq-question::after {
  content: '▾';
  font-size: 1.1rem;
  color: var(--primary);
  transition: transform 0.25s;
}

.faq-item[open] .faq-question::after {
  transform: rotate(180deg);
}

.faq-answer {
  padding: 0 1.35rem 1.25rem;
  color: var(--text-muted);
  font-size: 0.88rem;
  line-height: 1.6;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 0.85rem;
}

/* Form Inputs */
input, select, textarea {
  background: rgba(9, 14, 28, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-sm);
  color: #fff;
  padding: 0.6rem 0.85rem;
  font-size: 0.85rem;
  font-family: inherit;
  width: 100%;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

input:focus, select:focus, textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 10px var(--primary-glow);
}

/* Modals */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1.5rem;
}

.modal-overlay.active {
  display: flex;
  animation: fadeIn 0.2s ease;
}

.modal-card {
  background: #0f172a;
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  padding: 2rem;
  max-width: 650px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
}

/* Footer */
footer {
  border-top: 1px solid var(--card-border);
  padding: 2.5rem 1.5rem;
  background: rgba(7, 11, 20, 0.95);
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
}

.footer-links {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.footer-link {
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.2s;
}

.footer-link:hover {
  color: var(--primary);
}

/* Toast */
.toast-notice {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: rgba(13, 22, 41, 0.95);
  border: 1px solid var(--primary);
  border-radius: var(--radius-md);
  padding: 0.75rem 1.25rem;
  color: #fff;
  font-size: 0.85rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px var(--primary-glow);
  z-index: 9999;
  display: none;
  align-items: center;
  gap: 0.5rem;
}

.toast-notice.show {
  display: flex;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Responsividade Mobile & Tablet */
@media (max-width: 980px) {
  .hero-container {
    grid-template-columns: 1fr;
    text-align: center;
    gap: 2rem;
  }
  .hero-pill-badge {
    margin: 0 auto;
  }
  .hero-cta-group {
    justify-content: center;
  }
  .hero-visual {
    order: -1;
  }
  .nav-desktop {
    display: none;
  }
  .mobile-menu-btn {
    display: flex;
  }
  .hero-title {
    font-size: 2.25rem;
  }
}

@media (max-width: 640px) {
  header {
    padding: 0.6rem 1rem;
  }
  main {
    padding: 1.25rem 1rem 3rem;
  }
  .hero-title {
    font-size: 1.9rem;
  }
  .hero-logo-card {
    padding: 1.5rem;
  }
  .hero-logo-img {
    width: 120px;
    height: 120px;
  }
  .card {
    padding: 1.25rem;
  }
  .grid-stats {
    grid-template-columns: 1fr;
  }
  .grid-features {
    grid-template-columns: 1fr;
  }
}
`;
