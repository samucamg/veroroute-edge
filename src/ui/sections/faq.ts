/**
 * Seção de Dúvidas Frequentes (FAQ) & Diagnóstico de Erros Comuns
 */

export function renderFaqSection(): string {
  return `
    <div id="tab-faq" class="tab-pane">
      <div class="card">
        <div class="card-title">
          <span>❓</span> Central de Dúvidas Frequentes & Diagnóstico de Erros
        </div>
        <p class="card-subtitle">
          Respostas claras para as principais dúvidas técnicas e resoluções passo a passo para qualquer código de erro.
        </p>

        <!-- DIAGNÓSTICO DE ERROS HTTP -->
        <h3 style="font-size: 1.15rem; color: #fff; margin: 1.5rem 0 1rem;">
          🚨 Diagnóstico de Erros Comuns & Solução
        </h3>

        <!-- ERRO 503 -->
        <details class="faq-item" open>
          <summary class="faq-question">
            <span style="display:flex; align-items:center; gap:0.5rem;">
              <span class="badge badge-red">HTTP 503</span>
              <span>Erro: "Server Misconfigured" ou "OMNI_KEYS não configurado"</span>
            </span>
          </summary>
          <div class="faq-answer">
            <p><strong>Causa:</strong> O gateway adota a política de segurança <em>Fail-Closed</em>. Se a variável <code>AUTH_TOKEN</code> ou os namespaces KV não estiverem vinculados, ele recusa conexões para evitar acessos desprotegidos.</p>
            <p style="margin-top: 0.5rem;"><strong>Como resolver:</strong></p>
            <ol style="margin-left: 1.2rem; margin-top: 0.25rem;">
              <li>Crie o segredo do token mestre: <code>npx wrangler secret put AUTH_TOKEN</code>.</li>
              <li>Verifique no seu <code>wrangler.jsonc</code> se os bindings <code>OMNI_CACHE</code> e <code>OMNI_KEYS</code> contêm IDs válidos criados via <code>npx wrangler kv:namespace create</code>.</li>
              <li>Em ambiente local de desenvolvimento, certifique-se de criar o arquivo <code>.dev.vars</code> com a variável <code>AUTH_TOKEN=seu_token_aqui</code>.</li>
            </ol>
          </div>
        </details>

        <!-- ERRO 401 -->
        <details class="faq-item">
          <summary class="faq-question">
            <span style="display:flex; align-items:center; gap:0.5rem;">
              <span class="badge badge-amber">HTTP 401</span>
              <span>Erro: "Unauthorized" / Token Inválido</span>
            </span>
          </summary>
          <div class="faq-answer">
            <p><strong>Causa:</strong> A requisição não incluiu o cabeçalho <code>Authorization: Bearer &lt;token&gt;</code> ou o token fornecido não corresponde nem ao <code>AUTH_TOKEN</code> mestre nem a uma Chave Virtual ativa.</p>
            <p style="margin-top: 0.5rem;"><strong>Como resolver:</strong></p>
            <p>Verifique o cabeçalho HTTP enviado pelo seu cliente ou IDE. O formato obrigatório é:</p>
            <div class="code-container" style="margin: 0.5rem 0;">
              <pre class="code-content"><code>Authorization: Bearer sk-vr-sua-chave-virtual-aqui</code></pre>
            </div>
          </div>
        </details>

        <!-- ERRO 402 -->
        <details class="faq-item">
          <summary class="faq-question">
            <span style="display:flex; align-items:center; gap:0.5rem;">
              <span class="badge badge-purple">HTTP 402</span>
              <span>Erro: "Payment Required" / Limite de Orçamento Esgotado</span>
            </span>
          </summary>
          <div class="faq-answer">
            <p><strong>Causa:</strong> A Chave Virtual que realizou a chamada atingiu seu teto de orçamento diário (<code>dailyBudgetUsd</code>) ou mensal (<code>monthlyBudgetUsd</code>) configurado no painel administrativo.</p>
            <p style="margin-top: 0.5rem;"><strong>Como resolver:</strong></p>
            <p>Acesse a aba <strong>⚙️ Administração</strong>, localize a Chave Virtual correspondente e aumente o limite de orçamento ou resete o valor de consumo acumulado.</p>
          </div>
        </details>

        <!-- ERRO 429 -->
        <details class="faq-item">
          <summary class="faq-question">
            <span style="display:flex; align-items:center; gap:0.5rem;">
              <span class="badge badge-cyan">HTTP 429</span>
              <span>Erro: "Rate Limit Exceeded" / Provedores em Cooldown</span>
            </span>
          </summary>
          <div class="faq-answer">
            <p><strong>Causa:</strong> O limite de requisições por minuto (RPM) da sua chave foi ultrapassado, ou todos os provedores candidatos da rota entraram simultaneamente em cooldown de 60 segundos por rejeição dos servidores upstream.</p>
            <p style="margin-top: 0.5rem;"><strong>Como resolver:</strong></p>
            <ol style="margin-left: 1.2rem; margin-top: 0.25rem;">
              <li>Aguarde 60 segundos para que a janela deslizante de cooldown do KV seja liberada.</li>
              <li>Adicione múltiplas chaves de API separadas por vírgula para balanceamento em pool (ex: <code>GROQ_API_KEYS=chave1,chave2,chave3</code>).</li>
              <li>Adicione mais provedores alternativos na cascata para garantir que sempre haja um provedor reserva disponível.</li>
            </ol>
          </div>
        </details>

        <!-- ERRO DE SSL/DOMÍNIO -->
        <details class="faq-item">
          <summary class="faq-question">
            <span style="display:flex; align-items:center; gap:0.5rem;">
              <span class="badge badge-red">DNS / SSL</span>
              <span>Erro: "SSL Handshake Failed" ou Domínio não responde</span>
            </span>
          </summary>
          <div class="faq-answer">
            <p><strong>Causa:</strong> O subdomínio no Cloudflare DNS está com o Proxy desligado (nuvem cinza), impedindo que a borda do Cloudflare Workers intercepte o tráfego HTTPS.</p>
            <p style="margin-top: 0.5rem;"><strong>Como resolver:</strong></p>
            <p>No painel da Cloudflare (DNS ➔ Registros), localize o registro de <code>veroroute</code> e ative o <strong>Proxy (Nuvem Laranja)</strong>. O certificado SSL Universal Edge será validado e ativado imediatamente.</p>
          </div>
        </details>

        <!-- PRINCIPAIS DÚVIDAS GERAIS -->
        <h3 style="font-size: 1.15rem; color: #fff; margin: 2rem 0 1rem;">
          💡 Dúvidas Gerais sobre Uso & Configuração
        </h3>

        <details class="faq-item">
          <summary class="faq-question">
            Como configuro o VeroRoute Edge no Cursor, Cline ou VS Code?
          </summary>
          <div class="faq-answer">
            <p>Configure qualquer ferramenta que aceite uma Base URL OpenAI compatível informando:</p>
            <ul style="margin-left: 1.2rem; margin-top: 0.4rem; line-height: 1.7;">
              <li><strong>OpenAI Base URL:</strong> <code>https://veroroute.24hs.eu.org/v1</code></li>
              <li><strong>API Key:</strong> Sua Chave Virtual (<code>sk-vr-...</code>) ou o <code>AUTH_TOKEN</code> mestre.</li>
              <li><strong>Model:</strong> Qualquer modelo catalogado (ex: <code>gemini-2.5-flash</code>, <code>llama-3.3-70b-versatile</code>) ou combo criado (ex: <code>combo-fast</code>).</li>
            </ul>
          </div>
        </details>

        <details class="faq-item">
          <summary class="faq-question">
            Qual a diferença entre AUTH_TOKEN e Chaves Virtuais (sk-vr-...)?
          </summary>
          <div class="faq-answer">
            <p>O <strong>AUTH_TOKEN</strong> é a credencial mestre do proprietário do gateway. Ele concede permissão irrestrita para acessar o painel administrativo, cadastrar provedores, criar chaves e ver métricas. As <strong>Chaves Virtuais</strong> são criadas para clientes, amigos ou ferramentas específicas, com restrições de modelos, limites de taxa e controle de gastos.</p>
          </div>
        </details>

        <details class="faq-item">
          <summary class="faq-question">
            Como funciona o Fallback em Cascata se um provedor falhar?
          </summary>
          <div class="faq-answer">
            <p>Se você solicitar uma conclusão e o provedor principal retornar HTTP 429, 500, 502, 503 ou atingir timeout, o VeroRoute Edge intercepta o erro em milissegundos, coloca o provedor em cooldown temporário no KV e repete a mesma requisição no próximo provedor da lista, sem que seu cliente perceba qualquer instabilidade.</p>
          </div>
        </details>

        <details class="faq-item">
          <summary class="faq-question">
            Onde posso acompanhar o código-fonte e atualizações?
          </summary>
          <div class="faq-answer">
            <p>O projeto é 100% de código aberto sob licença MIT. Você pode clonar, abrir issues e contribuir diretamente no repositório oficial do GitHub:</p>
            <p style="margin-top: 0.5rem;">
              <a href="https://github.com/samucamg/veroroute-edge" target="_blank" rel="noopener noreferrer" style="color: var(--primary); font-weight: 600;">
                ➔ github.com/samucamg/veroroute-edge
              </a>
            </p>
          </div>
        </details>
      </div>
    </div>
  `;
}
