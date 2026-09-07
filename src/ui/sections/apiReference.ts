/**
 * Seção de Referência de API & Integrações de Clientes (cURL, Python, TS, IDEs)
 */

export function renderApiReferenceSection(): string {
  return `
    <div id="tab-api" class="tab-pane">
      <div class="card">
        <div class="card-title">
          <span>🔌</span> Referência de Integração da API & Exemplos de Código
        </div>
        <p class="card-subtitle">
          Exemplos prontos para copiar e colar em Python, TypeScript/JavaScript, cURL e configurações para IDEs modernas.
        </p>

        <!-- EXEMPLO PYTHON -->
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.1rem; color: var(--primary); margin-bottom: 0.5rem;">
            🐍 1. Python (SDK Oficial OpenAI)
          </h3>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0.5rem;">
            Basta apontar a <code>base_url</code> para o VeroRoute Edge:
          </p>
          <div class="code-container">
            <div class="code-header">
              <span>PYTHON (pip install openai)</span>
              <button class="copy-btn" onclick="copyCode(this)">Copiar</button>
            </div>
            <pre class="code-content"><code>from openai import OpenAI

client = OpenAI(
    base_url="https://veroroute.24hs.eu.org/v1",
    api_key="sk-vr-sua-chave-virtual-ou-auth-token"
)

response = client.chat.completions.create(
    model="gemini-2.5-flash",  # Ou qualquer modelo/combo configurado
    messages=[
        {"role": "system", "content": "Você é um assistente de IA ultra-rápido."},
        {"role": "user", "content": "Explique o roteamento em cascata em uma frase."}
    ],
    temperature=0.7,
    stream=True
)

for chunk in response:
    content = chunk.choices[0].delta.content or ""
    print(content, end="", flush=True)</code></pre>
          </div>
        </div>

        <!-- EXEMPLO TYPESCRIPT / JAVASCRIPT -->
        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1.1rem; color: var(--primary); margin-bottom: 0.5rem;">
            ⚡ 2. JavaScript / TypeScript (Fetch Nativo ou SDK OpenAI)
          </h3>
          <div class="code-container">
            <div class="code-header">
              <span>TYPESCRIPT / NODE.JS / BROWSER</span>
              <button class="copy-btn" onclick="copyCode(this)">Copiar</button>
            </div>
            <pre class="code-content"><code>import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://veroroute.24hs.eu.org/v1",
  apiKey: "sk-vr-sua-chave-virtual",
  dangerouslyAllowBrowser: true // Se for executar diretamente no frontend
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: "Olá VeroRoute Edge!" }],
  });

  console.log(completion.choices[0].message.content);
}

main();</code></pre>
          </div>
        </div>

        <!-- CONFIGURAÇÃO PARA IDES -->
        <div style="margin-bottom: 1.5rem;">
          <h3 style="font-size: 1.1rem; color: var(--primary); margin-bottom: 0.5rem;">
            💻 3. Configuração para Cursor, Cline e Claude Code
          </h3>
          <div class="grid-features" style="margin-top: 0.75rem;">
            <div class="feature-card">
              <div class="feature-title">Cursor IDE</div>
              <div class="feature-desc">
                Acesse <strong>Settings ➔ Models ➔ OpenAI API Key</strong>:
                <br>• Ative a opção <strong>Override OpenAI Base URL</strong>
                <br>• URL: <code>https://veroroute.24hs.eu.org/v1</code>
                <br>• Chave: Sua chave <code>sk-vr-...</code>
              </div>
            </div>

            <div class="feature-card">
              <div class="feature-title">Cline / Roo-Code</div>
              <div class="feature-desc">
                Selecione o provedor <strong>OpenAI-Compatible</strong>:
                <br>• Base URL: <code>https://veroroute.24hs.eu.org/v1</code>
                <br>• API Key: <code>sk-vr-...</code>
                <br>• Model ID: Digite o modelo desejado ou combo.
              </div>
            </div>

            <div class="feature-card">
              <div class="feature-title">VS Code Token Alias</div>
              <div class="feature-desc">
                Para ferramentas com suporte limitado a headers customizados, use o token alias embutido na rota:
                <br><code>https://veroroute.24hs.eu.org/api/v1/vscode/SEU_TOKEN/chat/completions</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
