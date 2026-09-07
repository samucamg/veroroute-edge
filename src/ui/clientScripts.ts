/**
 * Scripts de Interatividade do Cliente (SPA) para o VeroRoute Edge
 */

export function renderClientScripts(): string {
  return `
    <script>
      // ============ NAVEGAÇÃO ENTRE ABAS & LINKS INTERNOS ============
      function showTab(tabId) {
        if (!tabId) tabId = 'overview';
        // Normaliza tabId caso venha com # ou #tab-
        tabId = String(tabId).replace(/^#/, '').replace(/^tab-/, '');

        // Trata âncoras internas da documentação (ex: doc-1, doc-2)
        let scrollToId = null;
        if (tabId.startsWith('doc-')) {
          scrollToId = tabId;
          tabId = 'docs';
        }

        const validTabs = ['overview', 'docs', 'deploy', 'faq', 'providers', 'api', 'search', 'combos', 'playground', 'admin'];
        if (!validTabs.includes(tabId)) {
          // Se for uma âncora dentro da página, verifica se existe o elemento
          const targetEl = document.getElementById(tabId);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth' });
            return;
          }
          tabId = 'overview';
        }

        // Desativa todas as abas e botões
        document.querySelectorAll('.tab-pane').forEach(function(el) {
          el.classList.remove('active');
        });
        document.querySelectorAll('.nav-btn').forEach(function(el) {
          el.classList.remove('active');
        });

        // Ativa a aba alvo
        const pane = document.getElementById('tab-' + tabId);
        if (pane) {
          pane.classList.add('active');
        }

        // Ativa botões correspondentes (Desktop e Mobile)
        document.querySelectorAll('.nav-btn[data-tab="' + tabId + '"]').forEach(function(btn) {
          btn.classList.add('active');
        });

        // Atualiza URL hash no navegador
        if (history.replaceState) {
          history.replaceState(null, null, scrollToId ? ('#' + scrollToId) : ('#tab-' + tabId));
        }

        // Fecha menu mobile caso esteja aberto
        const drawer = document.getElementById('mobile-drawer');
        if (drawer) drawer.classList.remove('active');

        // Se havia âncora interna para rolar
        if (scrollToId) {
          setTimeout(function() {
            const el = document.getElementById(scrollToId);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }, 50);
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Dispara carregamentos contextuais de abas dinâmicas
        if (tabId === 'combos') {
          loadCombos();
        } else if (tabId === 'antigravity') {
          loadAntigravityStatus();
        } else if (tabId === 'admin') {
          loadAdmin();
        }
      }
      window.showTab = showTab;

      function toggleMobileMenu() {
        const drawer = document.getElementById('mobile-drawer');
        if (drawer) {
          drawer.classList.toggle('active');
        }
      }
      window.toggleMobileMenu = toggleMobileMenu;

      // Listener global para TODOS os links internos (a[href^="#"]) e botões com data-tab/data-doc
      document.addEventListener('click', function(e) {
        // Verifica se clicou em um botão de navegação
        const tabBtn = e.target.closest('[data-tab]');
        if (tabBtn) {
          e.preventDefault();
          showTab(tabBtn.dataset.tab);
          return;
        }

        // Verifica se clicou em link de documentação específica (ex: 1. Arquitetura)
        const docLink = e.target.closest('[data-doc]');
        if (docLink) {
          e.preventDefault();
          showTab('docs');
          const targetEl = document.getElementById(docLink.dataset.doc);
          if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
          return;
        }

        // Verifica se clicou em qualquer link âncora interno
        const anchor = e.target.closest('a[href^="#"]');
        if (anchor) {
          const href = anchor.getAttribute('href');
          if (href && href.length > 1) {
            e.preventDefault();
            const clean = href.replace(/^#/, '');
            if (clean.startsWith('tab-')) {
              showTab(clean.replace(/^tab-/, ''));
            } else if (clean.startsWith('doc-')) {
              showTab('docs');
              const el = document.getElementById(clean);
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            } else {
              showTab(clean);
            }
          }
        }
      });

      // Listener para eventos de histórico do navegador (Back / Forward)
      window.addEventListener('hashchange', function() {
        const hash = window.location.hash.replace(/^#/, '');
        if (hash) showTab(hash);
      });

      // ============ UTILITÁRIOS & CLIPBOARD ============
      function copyCode(btn) {
        const container = btn.closest('.code-container');
        if (!container) return;
        const code = container.querySelector('code, pre');
        if (!code) return;

        const text = code.innerText;
        navigator.clipboard.writeText(text).then(function() {
          const original = btn.innerText;
          btn.innerText = 'Copiado! ✓';
          btn.style.background = 'var(--emerald)';
          btn.style.color = '#000';
          setTimeout(function() {
            btn.innerText = original;
            btn.style.background = '';
            btn.style.color = '';
          }, 2000);
          showToast('Código copiado para a área de transferência');
        }).catch(function() {
          showToast('Erro ao copiar código');
        });
      }
      window.copyCode = copyCode;

      function copyBaseUrl() {
        const url = window.location.origin + '/v1';
        navigator.clipboard.writeText(url).then(function() {
          showToast('Base URL copiada: ' + url);
        });
      }
      window.copyBaseUrl = copyBaseUrl;

      function showToast(msg) {
        const toast = document.getElementById('toast-notice');
        if (!toast) return;
        toast.innerHTML = '<span>⚡</span> ' + escapeHtml(msg);
        toast.classList.add('show');
        setTimeout(function() {
          toast.classList.remove('show');
        }, 3000);
      }
      window.showToast = showToast;

      function escapeHtml(str) {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      // ============ AUTENTICAÇÃO DO PAINEL ADMIN ============
      function getAdminToken() {
        return sessionStorage.getItem('vr_admin_token') || '';
      }

      function setAdminToken(t) {
        if (t && t.trim()) sessionStorage.setItem('vr_admin_token', t.trim());
      }

      function promptAdminToken(force) {
        var cur = getAdminToken();
        if (cur && !force) return cur;
        var t = prompt('VeroRoute Admin: insira o AUTH_TOKEN:');
        if (t && t.trim()) {
          setAdminToken(t);
          return t.trim();
        }
        return cur;
      }

      function adminFetch(url, opts) {
        var token = getAdminToken();
        if (!token) {
          token = promptAdminToken(true);
          if (!token) return Promise.reject(new Error('Token admin não fornecido.'));
        }
        opts = opts || {};
        opts.headers = Object.assign({
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        }, opts.headers || {});

        return fetch(url, opts).then(function(res) {
          if (res.status === 401 || res.status === 503) {
            sessionStorage.removeItem('vr_admin_token');
            alert('Token inválido ou servidor sem AUTH_TOKEN configurado.');
          }
          return res;
        });
      }

      function v1Fetch(url, opts) {
        opts = opts || {};
        var tok = getAdminToken();
        if (tok) {
          opts.headers = Object.assign({ 'Authorization': 'Bearer ' + tok }, opts.headers || {});
        }
        return fetch(url, opts);
      }

      // ============ PLAYGROUND CHAT COMPLETIONS ============
      async function sendMessage() {
        const input = document.getElementById('chat-input');
        if (!input) return;
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
        botDiv.innerText = 'Processando na Edge...';
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
            botDiv.innerText = 'Erro (' + res.status + '): ' + err;
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
      window.sendMessage = sendMessage;

      // ============ BUSCA WEB & RAG ============
      function saveSearxUrl() {
        const url = document.getElementById('custom-searx-url').value.trim();
        localStorage.setItem('veroroute_searx_url', url);
        alert('URL do SearXNG configurada localmente!');
      }
      window.saveSearxUrl = saveSearxUrl;

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
      window.saveSearchConfig = saveSearchConfig;

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
              '<a href="' + escapeHtml(r.url) + '" target="_blank" rel="noopener noreferrer" style="color:var(--primary); font-weight:600; text-decoration:none;">' + escapeHtml(r.title) + '</a>' +
              '<p style="margin:0.2rem 0 0 0; font-size:0.75rem; color:var(--text-muted);">' + escapeHtml(r.snippet) + '</p>' +
            '</div>';
          });
          resEl.innerHTML = html || 'Nenhum resultado retornado.';
        } catch (e) {
          resEl.innerHTML = '<span style="color:var(--rose);">Erro: ' + escapeHtml(e.message) + '</span>';
        }
      }
      window.testSearch = testSearch;

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
        } catch (e) {}
      }

      // ============ ANTIGRAVITY OAUTH ============
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
      window.saveAgyToken = saveAgyToken;

      async function loadAntigravityStatus() {
        const badge = document.getElementById('agy-badge-configured');
        const detail = document.getElementById('agy-detail-text');
        const authBtn = document.getElementById('agy-auth-btn');
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
      window.loadAntigravityStatus = loadAntigravityStatus;

      async function saveAntigravityConfig() {
        const clientId = document.getElementById('agy-input-client-id').value.trim();
        const clientSecret = document.getElementById('agy-input-client-secret').value.trim();
        if (!clientId || !clientSecret) return alert('Por favor, informe tanto o Client ID quanto o Client Secret.');

        try {
          const res = await adminFetch('/api/admin/antigravity/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: clientId, clientSecret: clientSecret })
          });
          const data = await res.json();
          if (data.ok) {
            alert('Credenciais salvas com sucesso no KV OMNI_KEYS!');
            document.getElementById('agy-input-client-secret').value = '';
            loadAntigravityStatus();
          } else {
            alert('Erro ao salvar: ' + (data.error ? data.error.message : 'Desconhecido'));
          }
        } catch (e) {
          alert('Erro: ' + e.message);
        }
      }
      window.saveAntigravityConfig = saveAntigravityConfig;

      // ============ CHAVES VIRTUAIS ============
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
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.alignItems = 'center';
            item.style.padding = '0.6rem 0.8rem';
            item.style.background = 'rgba(255,255,255,0.03)';
            item.style.border = '1px solid var(--card-border)';
            item.style.borderRadius = '8px';
            item.innerHTML =
              '<div>' +
                '<div style="font-weight:600; font-size:0.85rem;">' + escapeHtml(k.name) + ' <span style="font-family:monospace; color:var(--primary); font-size:0.8rem; margin-left:0.5rem;">' + escapeHtml(k.key) + '</span></div>' +
                '<div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">Requisições: <strong>' + (k.requestsCount || 0) + '</strong> · Criada em: ' + escapeHtml(k.createdAt ? k.createdAt.substring(0, 10) : '') + '</div>' +
              '</div>' +
              '<button class="btn btn-secondary btn-sm" style="background:rgba(244,63,94,0.15); color:var(--rose);" data-action="delete-vkey" data-id="' + escapeHtml(k.id) + '">Revogar</button>';
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
      window.createVirtualKey = createVirtualKey;

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

      // ============ PROVEDORES NO PAINEL ADMIN ============
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
          renderAdminProviders(data.providers || []);
          if (statusEl) statusEl.innerText = data.providers.length + ' provedores carregados';
        } catch (e) {
          if (statusEl) statusEl.innerText = 'Erro: ' + e.message;
        }
        loadPresets();
        loadSearchConfig();
        loadVirtualKeys();
      }
      window.loadAdmin = loadAdmin;

      function renderAdminProviders(providers) {
        const grid = document.getElementById('admin-provider-grid');
        if (!grid) return;
        grid.innerHTML = '';
        providers.forEach(function(p) {
          const box = document.createElement('div');
          box.className = 'provider-box';
          box.innerHTML =
            '<div class="provider-header">' +
              '<span class="provider-name">' + escapeHtml(p.name) + '</span>' +
              '<span class="status-dot" style="background:' + (p.enabled ? 'var(--emerald)' : 'var(--rose)') + ';box-shadow:0 0 8px ' + (p.enabled ? 'var(--emerald)' : 'var(--rose)') + '"></span>' +
            '</div>' +
            '<span style="font-size:0.78rem; color: var(--text-muted);">' + (p.isBuiltIn ? 'Embutido' : 'Customizado') + ' · ' + (p.protocol || 'openai') + '</span>' +
            '<span style="font-size:0.75rem; color: var(--primary); word-break:break-all;">Modelos: ' + (p.models || []).join(', ') + '</span>' +
            '<span style="font-size:0.75rem; color: var(--text-muted);">Chaves: ' + (p.keys ? p.keys.length : 0) + '</span>' +
            '<div style="display:flex; gap:0.4rem; flex-wrap:wrap; margin-top:0.5rem;">' +
              '<button class="btn btn-secondary btn-sm" data-action="toggle-provider" data-id="' + escapeHtml(p.id) + '" data-enabled="' + (p.enabled ? 'false' : 'true') + '">' + (p.enabled ? 'Desativar' : 'Ativar') + '</button>' +
              '<button class="btn btn-secondary btn-sm" data-action="add-key" data-id="' + escapeHtml(p.id) + '">+ Chave</button>' +
              '<button class="btn btn-secondary btn-sm" data-action="add-model" data-id="' + escapeHtml(p.id) + '">+ Modelo</button>' +
              (!p.isBuiltIn ? '<button class="btn btn-secondary btn-sm" style="background:rgba(244,63,94,0.15);" data-action="delete-provider" data-id="' + escapeHtml(p.id) + '">Excluir</button>' : '') +
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
          alert(data.ok ? 'Provedor atualizado!' : 'Erro: ' + JSON.stringify(data.error || data));
        } catch (e) { alert('Erro: ' + e.message); }
      }

      async function addKey(id) {
        const key = prompt('Digite a chave de API a adicionar (para pool de balanceamento):');
        if (!key) return;
        try {
          const res = await adminFetch('/api/admin/providers/' + id + '/keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keys: [key] })
          });
          const data = await res.json();
          loadAdmin();
          alert(data.ok ? 'Chave adicionada! Pool atual: ' + data.keys.length : 'Erro: ' + JSON.stringify(data.error || data));
        } catch (e) { alert('Erro: ' + e.message); }
      }

      async function addModel(id) {
        const model = prompt('Digite o nome do modelo a adicionar:');
        if (!model) return;
        try {
          const res = await adminFetch('/api/admin/providers/' + id + '/models', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: model })
          });
          const data = await res.json();
          loadAdmin();
          alert(data.ok ? 'Modelo adicionado!' : 'Erro: ' + JSON.stringify(data.error || data));
        } catch (e) { alert('Erro: ' + e.message); }
      }

      async function deleteCustomProvider(id) {
        if (!confirm('Excluir o provedor customizado?')) return;
        try {
          const res = await adminFetch('/api/admin/providers/' + id, { method: 'DELETE' });
          const data = await res.json();
          loadAdmin();
          alert(data.ok ? 'Provedor excluído!' : 'Erro: ' + JSON.stringify(data.error || data));
        } catch (e) { alert('Erro: ' + e.message); }
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

        if (!name || !baseUrl) { alert('Preencha nome e Base URL'); return; }

        const body = {
          name: name,
          baseUrl: baseUrl,
          protocol: protocol,
          apiKeys: keysStr ? keysStr.split(',').map(function(s){return s.trim();}).filter(Boolean) : [],
          models: modelsStr ? modelsStr.split(',').map(function(s){return s.trim();}).filter(Boolean) : [],
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
            alert('Provedor adicionado! ID: ' + data.id);
            loadAdmin();
          } else {
            alert('Erro: ' + JSON.stringify(data.error || data));
          }
        } catch (e) { alert('Erro: ' + e.message); }
      }
      window.addCustomProvider = addCustomProvider;

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
      window.searchAdminModels = searchAdminModels;

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
              '<button class="btn btn-secondary btn-sm" style="margin-top:0.5rem;" data-action="apply-preset" data-id="' + escapeHtml(p.id) + '">⚡ Usar Template</button>';
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
        document.getElementById('acp-name').scrollIntoView({ behavior: 'smooth' });
        document.getElementById('acp-keys').focus();
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
      window.loadCombos = loadCombos;

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
                  '<span class="badge-edge" style="font-family:monospace; background:rgba(56,189,248,0.15); color:var(--primary); cursor:pointer;" title="Clique para copiar" data-action="copy-combo-id" data-id="' + escapeHtml(c.id) + '">' +
                    'model: ' + escapeHtml(c.id) + ' 📋' +
                  '</span>' +
                  '<span class="badge-edge" style="background:rgba(129,140,248,0.15); color:var(--accent); border-color:rgba(129,140,248,0.3);">' +
                    escapeHtml(stratLabel) +
                  '</span>' +
                '</div>' +
                (c.description ? '<p style="color:var(--text-muted); font-size:0.82rem; margin-top:0.35rem; line-height:1.4;">' + escapeHtml(c.description) + '</p>' : '') +
              '</div>' +
              '<div style="display:flex; gap:0.4rem; flex-wrap:wrap;">' +
                '<button class="btn btn-secondary btn-sm" data-action="test-combo" data-id="' + escapeHtml(c.id) + '">▶️ Testar Modelos</button>' +
                '<button class="btn btn-secondary btn-sm" data-action="quick-add-model" data-id="' + escapeHtml(c.id) + '">+ Modelo</button>' +
                '<button class="btn btn-secondary btn-sm" data-action="edit-combo" data-id="' + escapeHtml(c.id) + '">✏️ Editar</button>' +
                '<button class="btn btn-secondary btn-sm" style="background:rgba(244,63,94,0.15); color:var(--rose);" data-action="delete-combo" data-id="' + escapeHtml(c.id) + '">🗑️</button>' +
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
                '<span style="color:var(--text-muted); cursor:pointer; font-size:0.9rem; padding:0 2px;" title="Remover alvo" data-action="remove-combo-target" data-combo-id="' + escapeHtml(c.id) + '" data-provider="' + escapeHtml(t.provider) + '" data-model="' + escapeHtml(t.model) + '">✕</span>' +
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
      window.openNewComboModal = openNewComboModal;

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
      window.closeComboModal = closeComboModal;

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
            '<button type="button" class="btn btn-secondary btn-sm" style="color:var(--rose);" data-action="remove-modal-target" data-index="' + i + '">Remover</button>' +
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
      window.addModalTarget = addModalTarget;

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
      window.saveComboForm = saveComboForm;

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

      function openQuickAddModelModal(comboId) {
        const prov = prompt('Informe o provedor (ex: gemini, groq, cerebras, alibaba, antigravity, 1min, cloudflare-ai):');
        if (!prov) return;
        const mod = prompt('Informe o nome do modelo (ex: gemini-2.5-flash, llama-3.3-70b-versatile, qwen2.5-coder-32b-instruct):');
        if (!mod) return;

        adminFetch('/api/admin/combos/' + comboId + '/models', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: prov.trim(), model: mod.trim() })
        }).then(function(r) { return r.json(); }).then(function(data) {
          if (data.ok) loadCombos();
          else alert('Erro: ' + JSON.stringify(data));
        }).catch(function(e) { alert('Erro: ' + e.message); });
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
      window.testAllCombos = testAllCombos;

      // ============ DELEGAÇÃO DE EVENTOS PARA AÇÕES DINÂMICAS ============
      document.addEventListener('click', function(e) {
        const actionEl = e.target.closest('[data-action]');
        if (!actionEl) return;

        const action = actionEl.dataset.action;
        const id = actionEl.dataset.id;

        if (action === 'delete-vkey') {
          deleteVirtualKey(id);
        } else if (action === 'toggle-provider') {
          const enabled = actionEl.dataset.enabled === 'true';
          toggleProvider(id, enabled);
        } else if (action === 'add-key') {
          addKey(id);
        } else if (action === 'add-model') {
          addModel(id);
        } else if (action === 'delete-provider') {
          deleteCustomProvider(id);
        } else if (action === 'apply-preset') {
          applyPreset(id);
        } else if (action === 'copy-combo-id') {
          navigator.clipboard.writeText(id).then(function() {
            showToast('Modelo copiado: ' + id);
          });
        } else if (action === 'test-combo') {
          testCombo(id);
        } else if (action === 'quick-add-model') {
          openQuickAddModelModal(id);
        } else if (action === 'edit-combo') {
          openEditComboModal(id);
        } else if (action === 'delete-combo') {
          deleteCombo(id);
        } else if (action === 'remove-combo-target') {
          const comboId = actionEl.dataset.comboId;
          const provider = actionEl.dataset.provider;
          const model = actionEl.dataset.model;
          removeModelFromCombo(comboId, provider, model);
        } else if (action === 'remove-modal-target') {
          const idx = parseInt(actionEl.dataset.index, 10);
          removeModalTarget(idx);
        }
      });

      // ============ INICIALIZAÇÃO SPA ============
      window.addEventListener('DOMContentLoaded', function() {
        const hash = window.location.hash.replace(/^#/, '');
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');
        const initial = tabParam || hash || 'overview';
        showTab(initial);
      });
    </script>
  `;
}
