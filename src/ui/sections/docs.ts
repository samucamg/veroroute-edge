/**
 * Seção de Documentação Completa das 12 Funcionalidades do VeroRoute Edge
 */

export function renderDocsSection(): string {
  return `
    <div id="tab-docs" class="tab-pane">
      <div class="card">
        <div class="card-title">
          <span>📚</span> Central de Documentação Técnica & Especificações
        </div>
        <p class="card-subtitle">
          Guia de referência arquitetural e operacional abrangendo todas as 12 camadas do sistema VeroRoute Edge.
        </p>

        <!-- ÍNDICE RÁPIDO INTERNO -->
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--card-border); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 2rem;">
          <div style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--primary);">
            📋 Navegação Rápida pelos Módulos:
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 0.5rem; font-size: 0.85rem;">
            <a href="#doc-1" class="footer-link">1. Visão Geral da Arquitetura</a>
            <a href="#doc-2" class="footer-link">2. Segurança e Autenticação</a>
            <a href="#doc-3" class="footer-link">3. Matriz de Provedores</a>
            <a href="#doc-4" class="footer-link">4. Algoritmos de Roteamento</a>
            <a href="#doc-5" class="footer-link">5. Emulação de Tool Calling</a>
            <a href="#doc-6" class="footer-link">6. Resiliência e Cache Edge</a>
            <a href="#doc-7" class="footer-link">7. Controle de Quotas e Custos</a>
            <a href="#doc-8" class="footer-link">8. Ponte Multimodal & RAG</a>
            <a href="#doc-9" class="footer-link">9. Painel Administrativo</a>
            <a href="#doc-10" class="footer-link">10. Integrações & Antigravity OAuth</a>
            <a href="#doc-11" class="footer-link">11. Matriz de Endpoints da API</a>
            <a href="#doc-12" class="footer-link">12. Variáveis de Ambiente</a>
          </div>
        </div>

        <!-- MÓDULO 1 -->
        <section id="doc-1" style="margin-bottom: 2.5rem; scroll-margin-top: 80px;">
          <h2 style="font-size: 1.35rem; color: var(--primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>1.</span> Visão Geral da Arquitetura
          </h2>
          <p style="color: var(--text-muted); font-size: 0.92rem; margin-bottom: 1rem;">
            O <strong>VeroRoute Edge</strong> é construído especificamente para a arquitetura <strong>V8 Isolates da Cloudflare</strong>. Diferente de proxies convencionais baseados em contêineres Docker (que demandam alocação constante de RAM e sofrem com latência de inicialização), os Isolates iniciam em cerca de 15ms e executam o mais próximo possível do usuário final em mais de 300 datacenters mundiais.
          </p>
          <div class="alert alert-info">
            <span>ℹ️</span>
            <div>
              <strong>Serverless Puro:</strong> Custo de infraestrutura fixo $0 quando ocioso. A persistência de estado é descentralizada usando dois namespaces do Cloudflare Workers KV: <code>OMNI_CACHE</code> (armazenamento de respostas de inferência e cooldowns) e <code>OMNI_KEYS</code> (armazenamento de chaves virtuais, cotas e tokens OAuth).
            </div>
          </div>
          <div class="grid-features" style="margin-top: 1rem;">
            <div class="feature-card">
              <div class="feature-title">V8 Isolates</div>
              <div class="feature-desc">Isolamento criptográfico por requisição, consumo mínimo de memória e sem vulnerabilidades de contêiner compartilhado.</div>
            </div>
            <div class="feature-card">
              <div class="feature-title">Workers AI Nativo</div>
              <div class="feature-desc">Integração nativa via binding <code>env.AI</code> com modelos <code>@cf/*</code> sem custos de saída de rede.</div>
            </div>
          </div>
        </section>

        <!-- MÓDULO 2 -->
        <section id="doc-2" style="margin-bottom: 2.5rem; scroll-margin-top: 80px;">
          <h2 style="font-size: 1.35rem; color: var(--primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>2.</span> Segurança e Autenticação
          </h2>
          <p style="color: var(--text-muted); font-size: 0.92rem; margin-bottom: 1rem;">
            A segurança do gateway adota a política <strong>Fail-Closed (Falha Segura)</strong>: se a variável de ambiente <code>AUTH_TOKEN</code> não estiver definida no ambiente, todas as requisições à API são terminadas imediatamente com status <code>503 Service Unavailable</code>, impedindo qualquer acesso anônimo não intencional.
          </p>
          <ul style="color: var(--text-muted); font-size: 0.9rem; margin-left: 1.5rem; margin-bottom: 1rem; line-height: 1.8;">
            <li><strong>Proteção contra Timing Attacks:</strong> As validações de credenciais utilizam digests SHA-256 processados via <code>crypto.subtle.timingSafeEqual</code>, garantindo tempo constante de resposta e imunidade a análises de temporização de pacotes.</li>
            <li><strong>Chaves Virtuais (Virtual Keys):</strong> Em vez de expor suas chaves mestre aos clientes finais, gere tokens virtuais com prefixo <code>sk-vr-...</code>. Cada chave pode ter modelos permitidos restritos (<code>allowedModels</code>), limite de requisições por minuto (<code>rpmLimit</code>) e orçamento diário/mensal em USD.</li>
            <li><strong>Sanitização Upstream:</strong> Erros retornados por provedores terceiros (como OpenAI ou Groq) são interceptados e limpos. URLs internas, chaves de API nos headers ou stack traces são removidos antes do retorno ao cliente.</li>
            <li><strong>CORS Restrito no Admin:</strong> Rotas <code>/api/admin/*</code> aceitam apenas chamadas Same-Origin originadas da interface visual do gateway.</li>
          </ul>
        </section>

        <!-- MÓDULO 3 -->
        <section id="doc-3" style="margin-bottom: 2.5rem; scroll-margin-top: 80px;">
          <h2 style="font-size: 1.35rem; color: var(--primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>3.</span> Matriz de Provedores e Modelos
          </h2>
          <p style="color: var(--text-muted); font-size: 0.92rem; margin-bottom: 1rem;">
            O gateway oferece suporte pré-configurado para 17+ ecossistemas de provedores e suporte irrestrito a qualquer API compatível com o padrão OpenAI ou Anthropic:
          </p>
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Provedor</th>
                  <th>Tipo de Autenticação</th>
                  <th>Tool Calling Nativo</th>
                  <th>Tool Calling Emulado</th>
                  <th>Streaming SSE</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><strong>Google Gemini</strong></td><td>Query Param / Bearer</td><td>✅ Sim</td><td>—</td><td>✅ Sim</td></tr>
                <tr><td><strong>Groq</strong></td><td>Bearer Header</td><td>✅ Sim</td><td>—</td><td>✅ Sim</td></tr>
                <tr><td><strong>OpenAI</strong></td><td>Bearer Header</td><td>✅ Sim</td><td>—</td><td>✅ Sim</td></tr>
                <tr><td><strong>Anthropic (Claude)</strong></td><td>x-api-key / Bearer</td><td>✅ Sim</td><td>—</td><td>✅ Sim</td></tr>
                <tr><td><strong>DeepSeek</strong></td><td>Bearer Header</td><td>✅ Sim</td><td>—</td><td>✅ Sim</td></tr>
                <tr><td><strong>Cerebras</strong></td><td>Bearer Header</td><td>✅ Sim</td><td>—</td><td>✅ Sim</td></tr>
                <tr><td><strong>Mistral AI</strong></td><td>Bearer Header</td><td>✅ Sim</td><td>—</td><td>✅ Sim</td></tr>
                <tr><td><strong>OpenRouter</strong></td><td>Bearer Header</td><td>✅ Sim</td><td>—</td><td>✅ Sim</td></tr>
                <tr><td><strong>Cloudflare Workers AI</strong></td><td>Binding Nativo <code>env.AI</code></td><td>❌ Não</td><td>✅ Sim (Emulado)</td><td>✅ Sim</td></tr>
                <tr><td><strong>1min AI</strong></td><td>Bearer Header</td><td>❌ Não</td><td>✅ Sim (Emulado)</td><td>✅ Sim</td></tr>
                <tr><td><strong>Pollinations AI</strong></td><td>Gratuito / Sem chave</td><td>❌ Não</td><td>✅ Sim (Emulado)</td><td>✅ Sim</td></tr>
                <tr><td><strong>Antigravity (Google Code Assist)</strong></td><td>OAuth 2.0 (Refresh Token)</td><td>✅ Sim</td><td>—</td><td>✅ Sim</td></tr>
                <tr><td><strong>Provedores Customizados</strong></td><td>Custom Base URL / Header</td><td>Configurável</td><td>Configurável</td><td>✅ Sim</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- MÓDULO 4 -->
        <section id="doc-4" style="margin-bottom: 2.5rem; scroll-margin-top: 80px;">
          <h2 style="font-size: 1.35rem; color: var(--primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>4.</span> Algoritmos e Estratégias de Roteamento
          </h2>
          <p style="color: var(--text-muted); font-size: 0.92rem; margin-bottom: 1rem;">
            O <strong>Cascade Router</strong> gerencia a lista de provedores candidatos para cada requisição, decidindo a ordem de chamada e aplicando resiliência com 11 estratégias matemáticas:
          </p>

          <div class="grid-features">
            <div class="feature-card">
              <div class="feature-title">1. Priority (Padrão)</div>
              <div class="feature-desc">Executa a lista de provedores estritamente na ordem de prioridade definida na configuração.</div>
            </div>
            <div class="feature-card">
              <div class="feature-title">2. Weighted (Ponderado)</div>
              <div class="feature-desc">Distribui as chamadas estatisticamente com base em pesos percentuais (ex: 70% Provedor A, 30% Provedor B).</div>
            </div>
            <div class="feature-card">
              <div class="feature-title">3. Round-Robin</div>
              <div class="feature-desc">Alterna ciclicamente entre todos os provedores saudáveis do pool, dividindo a carga igualmente.</div>
            </div>
            <div class="feature-card">
              <div class="feature-title">4. P2C (Power of Two Choices)</div>
              <div class="feature-desc">Sorteia aleatoriamente dois candidatos e despacha para aquele com menor carga/latência recente.</div>
            </div>
            <div class="feature-card">
              <div class="feature-title">5. Fill-First</div>
              <div class="feature-desc">Utiliza a capacidade máxima de um provedor principal até o limite antes de repassar requisições aos seguintes.</div>
            </div>
            <div class="feature-card">
              <div class="feature-title">6. Least-Used</div>
              <div class="feature-desc">Prioriza o provedor que acumulou o menor volume de requisições na janela atual.</div>
            </div>
            <div class="feature-card">
              <div class="feature-title">7. Cost (Menor Custo)</div>
              <div class="feature-desc">Ordena automaticamente os provedores pelo menor preço por milhão de tokens (priorizando free tiers $0).</div>
            </div>
            <div class="feature-card">
              <div class="feature-title">8. Reset-Aware</div>
              <div class="feature-desc">Identifica e prioriza provedores cujas cotas de rate limit acabaram de ser resetadas.</div>
            </div>
            <div class="feature-card">
              <div class="feature-title">9. LKGP (Last Known Good)</div>
              <div class="feature-desc">Reutiliza o último provedor que concluiu com sucesso uma chamada até que ocorra um erro.</div>
            </div>
            <div class="feature-card">
              <div class="feature-title">10. Session-Affinity</div>
              <div class="feature-desc">Prende o usuário ao mesmo provedor durante sua sessão identificada pelo header <code>X-Session-ID</code>.</div>
            </div>
            <div class="feature-card">
              <div class="feature-title">11. Auto-Combo</div>
              <div class="feature-desc">Combina múltiplos modelos e provedores sob um alias virtual (ex: <code>combo-fast</code> ou <code>combo-smart</code>).</div>
            </div>
          </div>

          <div class="alert alert-warning" style="margin-top: 1rem;">
            <span>⚡</span>
            <div>
              <strong>Cooldown & Circuit Breaker:</strong> Se um provedor retorna HTTP 429 (Rate Limit), ele entra em <strong>cooldown imediato de 60 segundos</strong> persistido no KV. Se acumular <strong>5 falhas consecutivas</strong>, o Circuit Breaker abre por <strong>5 minutos</strong>, pulando o provedor sem qualquer delay de conexão.
            </div>
          </div>
        </section>

        <!-- MÓDULO 5 -->
        <section id="doc-5" style="margin-bottom: 2.5rem; scroll-margin-top: 80px;">
          <h2 style="font-size: 1.35rem; color: var(--primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>5.</span> Emulação Universal de Function Calling (Tool Calling)
          </h2>
          <p style="color: var(--text-muted); font-size: 0.92rem; margin-bottom: 1rem;">
            Muitos modelos de código aberto ou tiers gratuitos (como Llama 3 no Cloudflare Workers AI ou Pollinations) não oferecem a API nativa de <code>tools</code> da OpenAI. O VeroRoute Edge resolve isso com um <strong>motor de emulação transparente</strong>:
          </p>
          <ul style="color: var(--text-muted); font-size: 0.9rem; margin-left: 1.5rem; margin-bottom: 1rem; line-height: 1.8;">
            <li><strong>Injeção de Metadados:</strong> Converte a declaração de ferramentas enviada pelo cliente em instruções de sistema em JSON estrito com schemas de validação.</li>
            <li><strong>Parser Resiliente:</strong> Processa blocos <code>\`\`\`json</code> ou chamadas inline de funções contidas na saída de texto bruto do modelo.</li>
            <li><strong>Reconstrução de Streaming SSE:</strong> Quando o cliente requisita <code>stream: true</code>, o emulador intercepta o texto progressivo, extrai a ferramenta e emite chunks SSE compatíveis com a OpenAI contendo o bloco <code>tool_calls</code> e fechamento <code>[DONE]</code>.</li>
            <li><strong>Suporte a <code>tool_choice</code>:</strong> Reconhece <code>none</code>, <code>auto</code> e funções forçadas específicas (<code>{"type":"function", ...}</code>).</li>
          </ul>
        </section>

        <!-- MÓDULO 6 -->
        <section id="doc-6" style="margin-bottom: 2.5rem; scroll-margin-top: 80px;">
          <h2 style="font-size: 1.35rem; color: var(--primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>6.</span> Resiliência, Cache Edge e Desempenho
          </h2>
          <p style="color: var(--text-muted); font-size: 0.92rem; margin-bottom: 1rem;">
            Para acelerar respostas e mitigar custos de tokens repetidos, o VeroRoute Edge integra-se com a <strong>Cloudflare Cache API</strong> diretamente nos servidores de borda:
          </p>
          <div class="alert alert-success">
            <span>🚀</span>
            <div>
              <strong>Critério de Cache Determinístico:</strong> Requisições com <code>temperature &lt;= 0.1</code> e <code>stream: false</code> geram um hash criptográfico SHA-256 do payload. Se já consultadas, retornam a resposta cacheada em <strong>menos de 200ms</strong> com o cabeçalho <code>X-Cache: HIT</code>.
            </div>
          </div>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.75rem;">
            O tempo de retenção do cache é controlado pela variável <code>CACHE_TTL_SECONDS</code> (padrão: 3600 segundos). Além disso, cada candidato individual possui um timeout rígido via <code>AbortSignal</code> de <code>CASCADE_TIMEOUT_MS</code> (padrão: 45000ms).
          </p>
        </section>

        <!-- MÓDULO 7 -->
        <section id="doc-7" style="margin-bottom: 2.5rem; scroll-margin-top: 80px;">
          <h2 style="font-size: 1.35rem; color: var(--primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>7.</span> Controle de Quotas, Rate Limiting e Orçamentos
          </h2>
          <p style="color: var(--text-muted); font-size: 0.92rem; margin-bottom: 1rem;">
            Mantenha custos previsíveis e proteja suas contas de picos inesperados:
          </p>
          <ul style="color: var(--text-muted); font-size: 0.9rem; margin-left: 1.5rem; line-height: 1.8;">
            <li><strong>Rate Limiting em Janela Deslizante (RPM):</strong> Monitora o volume de chamadas por minuto de cada chave virtual no KV.</li>
            <li><strong>Controle de Orçamento em USD:</strong> Calcula o custo estimado da requisição a partir dos tokens de prompt e completion. Caso uma chave ultrapasse <code>dailyBudgetUsd</code> ou <code>monthlyBudgetUsd</code>, o acesso é interrompido com <strong>HTTP 402 Payment Required</strong>.</li>
            <li><strong>Fair-Share Quota Sharing:</strong> Redistribui cotas livres em modo de rajada controlada quando ativado.</li>
          </ul>
        </section>

        <!-- MÓDULO 8 -->
        <section id="doc-8" style="margin-bottom: 2.5rem; scroll-margin-top: 80px;">
          <h2 style="font-size: 1.35rem; color: var(--primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>8.</span> Ponte Multimodal (Visão) e Transcrição de Áudio
          </h2>
          <p style="color: var(--text-muted); font-size: 0.92rem; margin-bottom: 1rem;">
            O VeroRoute Edge permite que clientes enviem imagens mesmo quando o modelo principal selecionado for exclusivamente textual:
          </p>
          <ul style="color: var(--text-muted); font-size: 0.9rem; margin-left: 1.5rem; line-height: 1.8;">
            <li><strong>Modality Bridge:</strong> Detecta <code>image_url</code> nas mensagens. Se o modelo alvo não suportar visão, o gateway consulta um modelo de visão secundário rápido (como Gemini Flash ou Llama Vision), transcreve a imagem e insere a descrição textual no contexto do modelo principal.</li>
            <li><strong>Endpoints de Áudio:</strong> Compatibilidade completa com rotas OpenAI de áudio: <code>/v1/audio/speech</code> (TTS), <code>/v1/audio/transcriptions</code> (STT Whisper) e <code>/v1/audio/translations</code>.</li>
            <li><strong>Web Search RAG & Jina Reader:</strong> Envie URLs nas mensagens ou acione o endpoint <code>/v1/web/fetch</code> para obter conteúdo Markdown limpo via Jina Reader, ou faça buscas na web em tempo real via DuckDuckGo, SearXNG, Serper, Brave e Tavily.</li>
          </ul>
        </section>

        <!-- MÓDULO 9 -->
        <section id="doc-9" style="margin-bottom: 2.5rem; scroll-margin-top: 80px;">
          <h2 style="font-size: 1.35rem; color: var(--primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>9.</span> Painel de Administração e Gerenciamento de Chaves
          </h2>
          <p style="color: var(--text-muted); font-size: 0.92rem; margin-bottom: 1rem;">
            Acessível diretamente na aba <strong>⚙️ Administração</strong> deste website com autenticação pelo <code>AUTH_TOKEN</code>:
          </p>
          <ul style="color: var(--text-muted); font-size: 0.9rem; margin-left: 1.5rem; line-height: 1.8;">
            <li><strong>Gerenciador de Provedores Customizados:</strong> Adicione qualquer endpoint OpenAI/Anthropic em tempo de execução sem fazer redeploy.</li>
            <li><strong>Templates ELO Rápidos:</strong> Presets com um clique para os provedores gratuitos mais bem avaliados (Groq, Cerebras, Pollinations, Gemini).</li>
            <li><strong>Chaves Virtuais:</strong> Emita, revogue e inspecione consumo de tokens e custos em USD de cada cliente.</li>
            <li><strong>Monitor de Circuit Breakers:</strong> Visualize em tempo real o status de cada provedor (Closed / Open / Half-Open).</li>
          </ul>
        </section>

        <!-- MÓDULO 10 -->
        <section id="doc-10" style="margin-bottom: 2.5rem; scroll-margin-top: 80px;">
          <h2 style="font-size: 1.35rem; color: var(--primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>10.</span> Integrações Especiais e OAuth (Google Code Assist / Antigravity)
          </h2>
          <p style="color: var(--text-muted); font-size: 0.92rem; margin-bottom: 1rem;">
            O gateway possui integração nativa com o <strong>Google Cloud Code Assist (Antigravity)</strong> através de fluxo OAuth 2.0 seguro:
          </p>
          <ul style="color: var(--text-muted); font-size: 0.9rem; margin-left: 1.5rem; line-height: 1.8;">
            <li><strong>Rotas de Autorização:</strong> <code>/api/oauth/antigravity/authorize</code> gera state criptográfico temporário no KV contra ataques CSRF.</li>
            <li><strong>Callback Automatizado:</strong> <code>/api/oauth/antigravity/callback</code> troca o código de autorização por tokens de refresh persistidos no KV <code>OMNI_KEYS</code>.</li>
            <li><strong>Importação Direta:</strong> É possível importar refresh tokens existentes através do endpoint <code>/api/oauth/antigravity/import</code>.</li>
          </ul>
        </section>

        <!-- MÓDULO 11 -->
        <section id="doc-11" style="margin-bottom: 2.5rem; scroll-margin-top: 80px;">
          <h2 style="font-size: 1.35rem; color: var(--primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>11.</span> Matriz de Endpoints da API
          </h2>
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Endpoint</th>
                  <th>Método</th>
                  <th>Autenticação</th>
                  <th>Finalidade</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><code>/health</code></td><td>GET</td><td>Pública</td><td>Checagem de integridade e versão do gateway</td></tr>
                <tr><td><code>/v1/models</code></td><td>GET</td><td>Bearer Token</td><td>Catálogo unificado de modelos e combos</td></tr>
                <tr><td><code>/v1/chat/completions</code></td><td>POST</td><td>Bearer Token</td><td>Chat completions compatível com OpenAI</td></tr>
                <tr><td><code>/v1/messages</code></td><td>POST</td><td>Bearer Token</td><td>Compatibilidade nativa com Anthropic Claude</td></tr>
                <tr><td><code>/v1/responses</code></td><td>POST</td><td>Bearer Token</td><td>Adaptador OpenAI Responses API</td></tr>
                <tr><td><code>/v1/search</code></td><td>POST</td><td>Bearer Token</td><td>Busca web agregada para RAG</td></tr>
                <tr><td><code>/v1/web/fetch</code></td><td>POST</td><td>Bearer Token</td><td>Extração limpa de páginas via Jina Reader</td></tr>
                <tr><td><code>/v1/images/generations</code></td><td>POST</td><td>Bearer Token</td><td>Geração de imagens</td></tr>
                <tr><td><code>/v1/audio/transcriptions</code></td><td>POST</td><td>Bearer Token</td><td>Transcrição de áudio via Whisper</td></tr>
                <tr><td><code>/api/admin/*</code></td><td>GET/POST/DEL</td><td>Master Token</td><td>APIs administrativas e gestão de chaves</td></tr>
                <tr><td><code>/api/mcp/*</code></td><td>GET/POST</td><td>Master Token</td><td>Servidor MCP (Model Context Protocol)</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- MÓDULO 12 -->
        <section id="doc-12" style="margin-bottom: 1.5rem; scroll-margin-top: 80px;">
          <h2 style="font-size: 1.35rem; color: var(--primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>12.</span> Guia de Variáveis de Ambiente & Bindings
          </h2>
          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Nome da Variável</th>
                  <th>Tipo</th>
                  <th>Padrão</th>
                  <th>Descrição</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><code>AUTH_TOKEN</code></td><td>Secret (Obrigatório)</td><td>—</td><td>Token mestre do gateway. Se ausente, ativa modo Fail-Closed</td></tr>
                <tr><td><code>DEFAULT_ROUTING_STRATEGY</code></td><td>Var (Opcional)</td><td><code>priority</code></td><td>Estratégia de roteamento: priority, weighted, round-robin, p2c, cost</td></tr>
                <tr><td><code>MAX_RETRIES</code></td><td>Var (Opcional)</td><td><code>3</code></td><td>Número de tentativas de fallback por candidato</td></tr>
                <tr><td><code>RETRY_DELAY_MS</code></td><td>Var (Opcional)</td><td><code>1000</code></td><td>Tempo base de espera entre retentativas em ms</td></tr>
                <tr><td><code>CASCADE_TIMEOUT_MS</code></td><td>Var (Opcional)</td><td><code>45000</code></td><td>Timeout individual por provedor em ms</td></tr>
                <tr><td><code>CACHE_TTL_SECONDS</code></td><td>Var (Opcional)</td><td><code>3600</code></td><td>Tempo de retenção do cache na Cloudflare Cache API</td></tr>
                <tr><td><code>ENABLE_MODALITY_BRIDGE</code></td><td>Var (Opcional)</td><td><code>true</code></td><td>Habilita transcodificação de imagens para modelos de texto</td></tr>
                <tr><td><code>ENABLE_CONTEXT_COMPRESSION</code></td><td>Var (Opcional)</td><td><code>true</code></td><td>Remove redundâncias de prompts longos para poupar tokens</td></tr>
                <tr><td><code>OMNI_CACHE</code></td><td>KV Binding (Obrigatório)</td><td>—</td><td>Namespace KV para cache de respostas e cooldowns</td></tr>
                <tr><td><code>OMNI_KEYS</code></td><td>KV Binding (Obrigatório)</td><td>—</td><td>Namespace KV para chaves virtuais, cotas e tokens</td></tr>
                <tr><td><code>AI</code></td><td>Binding (Opcional)</td><td>—</td><td>Binding nativo para Cloudflare Workers AI</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  `;
}
