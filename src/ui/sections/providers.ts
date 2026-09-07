/**
 * Seção de Provedores & Modelos Conectados do VeroRoute Edge
 */

export function renderProvidersSection(): string {
  return `
    <div id="tab-providers" class="tab-pane">
      <div class="card">
        <div class="card-title">
          <span>🌐</span> Provedores Corporativos & Gratuitos Integrados
        </div>
        <p class="card-subtitle">
          Ecossistema completo de provedores de IA suportados nativamente, com balanceamento de chaves e métricas em tempo real.
        </p>

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
  `;
}
