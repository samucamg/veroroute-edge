/**
 * Seções Administrativas, Combos, OAuth, Busca Web, Playground e Modais
 */

export function renderSearchSection(): string {
  return `
    <!-- TAB: BUSCA WEB & RAG -->
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
curl -X POST https://veroroute.24hs.eu.org/v1/search \\
  -H "Content-Type: application/json" \\
  -d '{"query": "Últimas notícias sobre inteligência artificial", "limit": 5}'
        </div>
      </div>
    </div>
  `;
}

export function renderAntigravitySection(): string {
  return `
    <!-- TAB: ANTIGRAVITY OAUTH -->
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
  `;
}

export function renderCombosSection(): string {
  return `
    <!-- TAB: COMBOS & QUOTA SHARING -->
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
  `;
}

export function renderPlaygroundSection(): string {
  return `
    <!-- TAB: PLAYGROUND -->
    <div id="tab-playground" class="tab-pane">
      <div class="card">
        <div class="card-title">🧪 Playground Interativo de Testes</div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
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
  `;
}

export function renderAdminSection(): string {
  return `
    <!-- TAB: ADMINISTRACAO -->
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
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
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
        </div>
        <button class="btn" style="margin-top:1.25rem;" onclick="addCustomProvider()">Adicionar Provedor</button>
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
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
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
  `;
}

export function renderComboModal(): string {
  return `
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
  `;
}
