/** Deploy guide rendered inside the Worker dashboard. */
export function renderDeploymentSection(): string {
  return `
    <div id="tab-deploy" class="tab-pane">
      <div class="card">
        <div class="card-title"><span>🚀</span> Deploy com uma única credencial</div>
        <p class="card-subtitle">
          O primeiro setup pede somente o <code>AUTH_TOKEN</code>. Todas as chaves de
          provedores são cadastradas depois, com segurança, pelo painel administrativo.
        </p>

        <div class="alert alert-success">
          <span>🔐</span>
          <div><strong>Único segredo inicial:</strong> <code>AUTH_TOKEN</code>. Não preencha
          OpenAI, Gemini, Groq ou outros provedores com valores falsos.</div>
        </div>

        <div style="text-align:center; margin:1.5rem 0;">
          <a class="btn" href="https://deploy.workers.cloudflare.com/?url=https://github.com/samucamg/veroroute-edge" target="_blank" rel="noopener noreferrer">
            ☁️ Deploy to Cloudflare
          </a>
        </div>

        <div class="steps-container">
          <div class="step-card"><div class="step-number">1</div><div class="step-body">
            <div class="step-title">Abra o Deploy to Cloudflare</div>
            <p style="color:var(--text-muted);font-size:.85rem;">Autorize o fork/deploy do repositório na sua conta Cloudflare.</p>
          </div></div>
          <div class="step-card"><div class="step-number">2</div><div class="step-body">
            <div class="step-title">Crie ou selecione os dois KV</div>
            <p style="color:var(--text-muted);font-size:.85rem;">Vincule <code>OMNI_CACHE</code> e <code>OMNI_KEYS</code>. São armazenamentos da Cloudflare para cooldown, rate limit e configuração do painel — não são API keys.</p>
          </div></div>
          <div class="step-card"><div class="step-number">3</div><div class="step-body">
            <div class="step-title">Informe somente AUTH_TOKEN</div>
            <p style="color:var(--text-muted);font-size:.85rem;">Use uma senha/token forte e privado. Nenhuma chave de provedor é obrigatória no deploy.</p>
          </div></div>
          <div class="step-card"><div class="step-number">4</div><div class="step-body">
            <div class="step-title">Configure tudo pelo painel</div>
            <p style="color:var(--text-muted);font-size:.85rem;">Abra a URL do Worker, entre em <strong>Administração</strong> com o AUTH_TOKEN e adicione apenas os provedores que desejar.</p>
          </div></div>
        </div>

        <h3 style="font-size:1.15rem;color:#fff;margin:1.75rem 0 .75rem;">Implantação manual opcional</h3>
        <div class="code-container">
          <div class="code-header"><span>TERMINAL</span><button class="copy-btn" onclick="copyCode(this)">Copiar</button></div>
          <pre class="code-content"><code>git clone https://github.com/samucamg/veroroute-edge.git
cd veroroute-edge
npm install
npx wrangler kv namespace create OMNI_CACHE
npx wrangler kv namespace create OMNI_KEYS
# Cole somente os IDs dos KV em wrangler.jsonc
npx wrangler secret put AUTH_TOKEN
npx wrangler deploy</code></pre>
        </div>

        <div class="alert alert-info" style="margin-top:1rem;"><span>💡</span><div>
          Cloudflare Workers AI e provedores keyless funcionam sem credenciais externas.
          Chaves via variáveis de ambiente continuam suportadas apenas como alternativa avançada.
        </div></div>
      </div>
    </div>
  `;
}
