/**
 * Constantes Globais, Credenciais Públicas OAuth e Catálogo do VeroRoute Edge
 */

// Credenciais Públicas Oficiais do Google Cloud Code Assist (Antigravity CLI / agy)
export const ANTIGRAVITY_PUBLIC_CONFIG = {
  get clientId() {
    return [94,93,89,88,66,95,67,68,83,29,69,76,83,65,29,14,69,5,66,6,3,92,1,64,94,25,23,23,72,66,70,87,26,29,12,65,25,91,7,89,9,93,66,92,16,4,75,76,0,5,17,66,14,12,66,17,93,10,24,29,12,0,12,26,26,17,72,30,1,76,15,6,14]
      .map((c, i) => String.fromCharCode(c ^ "omniroute-public-v1".charCodeAt(i % 19))).join("");
  },
  get clientSecret() {
    return [40,34,45,58,34,55,88,63,80,21,54,34,48,88,81,85,97,18,125,37,92,3,37,48,87,6,44,38,25,10,67,19,40,40,5]
      .map((c, i) => String.fromCharCode(c ^ "omniroute-public-v1".charCodeAt(i % 19))).join("");
  },
  authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  userInfoUrl: "https://www.googleapis.com/oauth2/v1/userinfo",
  scopes: [
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/cclog",
    "https://www.googleapis.com/auth/experimentsandconfigs",
  ],
  // Host usado pelo CLI/IDE oficiais (o Account Switcher e o language_server
  // apontam para o host "daily"). O host sem "daily" responde 429
  // RESOURCE_EXHAUSTED para contas consumer mesmo com quota disponível.
  runtimeBaseUrl: "https://daily-cloudcode-pa.googleapis.com",
  loadCodeAssistPath: "/v1internal:loadCodeAssist",
  onboardUserPath: "/v1internal:onboardUser",
  // RPC oficial de descoberta de modelos do Cloud Code Assist.
  // NÃO existe rota REST "/v1internal:models": o RPC correto é um POST em
  // /v1internal:fetchAvailableModels (host "daily" é o usado pelo CLI/IDE).
  fetchAvailableModelsPath: "/v1internal:fetchAvailableModels",
  generateContentPath: "/v1internal:generateContent",
  streamGenerateContentPath: "/v1internal:streamGenerateContent?alt=sse",
  userAgent:
    "antigravity/hub/2.35.0 (aidev_client; os_type=windows; arch=amd64; cl=1028447422)",
  /**
   * Projeto consumer usado pelo CLI oficial e pelo Account Switcher quando o
   * onboarding não devolve um companion project (não é um id secreto/da conta).
   */
  defaultProjectId: "aicode-consumers",
};

// Claude Code CLI OAuth
export const CLAUDE_PUBLIC_CONFIG = {
  clientId: "9d1c250a-e61b-44d9-88ed-5944d1962f5e",
  authorizeUrl: "https://claude.ai/oauth/authorize",
  tokenUrl: "https://api.anthropic.com/v1/oauth/token",
  scopes: ["org:create_api_key", "user:profile", "user:inference", "user:sessions:claude_code"],
};

// OpenAI Codex CLI OAuth
export const CODEX_PUBLIC_CONFIG = {
  clientId: "app_EMoamEEZ73f0CkXaXp7hrann",
  authorizeUrl: "https://auth.openai.com/oauth/authorize",
  tokenUrl: "https://auth.openai.com/oauth/token",
  scopes: "openid profile email offline_access",
};

/**
 * @deprecated Código legado — não é importado por nenhuma rota ativa.
 * A fonte de verdade para GET /v1/models é `listAllAvailableModels()` em
 * `src/config/modelRegistry.ts`, que lê de PROVIDER_REGISTRY + STATIC_PROVIDER_CATALOGS.
 * Este array pode ser removido em uma versão futura.
 */
export const DEFAULT_MODELS_CATALOG = [
  // --- Provedores Oficiais & Cloud ---
  {
    id: "gpt-4o",
    owned_by: "openai",
    provider: "openai",
    pricing: { input_per_million: 2.5, output_per_million: 10.0, free_tier: false },
    context_length: 128000,
  },
  {
    id: "gpt-4o-mini",
    owned_by: "openai",
    provider: "openai",
    pricing: { input_per_million: 0.15, output_per_million: 0.6, free_tier: false },
    context_length: 128000,
  },
  {
    id: "o3-mini",
    owned_by: "openai",
    provider: "openai",
    pricing: { input_per_million: 1.1, output_per_million: 4.4, free_tier: false },
    context_length: 200000,
  },
  {
    id: "qwen-max",
    owned_by: "alibaba",
    provider: "alibaba",
    pricing: { input_per_million: 0.2, output_per_million: 0.6, free_tier: true },
    context_length: 32768,
  },
  {
    id: "qwen-plus",
    owned_by: "alibaba",
    provider: "alibaba",
    pricing: { input_per_million: 0.1, output_per_million: 0.3, free_tier: true },
    context_length: 131072,
  },

  // --- 1min.ai (com ReAct Tool Calling) ---
  {
    id: "1min/gpt-4o",
    owned_by: "1min",
    provider: "1min",
    pricing: { input_per_million: 0, output_per_million: 0, free_tier: true },
    context_length: 128000,
  },
  {
    id: "1min/claude-3-5-sonnet",
    owned_by: "1min",
    provider: "1min",
    pricing: { input_per_million: 0, output_per_million: 0, free_tier: true },
    context_length: 200000,
  },

  // --- Google Gemini (AI Studio / Free Tier: 15 RPM, 60M tokens/mês) ---
  {
    id: "gemini-2.5-flash",
    owned_by: "google",
    provider: "gemini",
    pricing: { input_per_million: 0, output_per_million: 0, free_tier: true },
    context_length: 1048576,
  },
  {
    id: "gemini-2.0-flash",
    owned_by: "google",
    provider: "gemini",
    pricing: { input_per_million: 0, output_per_million: 0, free_tier: true },
    context_length: 1048576,
  },
  {
    id: "gemini-2.5-pro",
    owned_by: "google",
    provider: "gemini",
    pricing: { input_per_million: 1.25, output_per_million: 5.0, free_tier: true },
    context_length: 2097152,
  },

  // --- Antigravity CLI / Google Cloud Code Assist (OAuth) ---
  {
    id: "antigravity/gemini-4-hydrogen-low",
    owned_by: "google-code-assist",
    provider: "antigravity",
    pricing: { input_per_million: 0, output_per_million: 0, free_tier: true },
    context_length: 1048576,
    max_output_tokens: 262144,
  },
  {
    id: "antigravity/gemini-4-hydrogen-medium",
    owned_by: "google-code-assist",
    provider: "antigravity",
    pricing: { input_per_million: 0, output_per_million: 0, free_tier: true },
    context_length: 1048576,
    max_output_tokens: 262144,
  },
  {
    id: "antigravity/gemini-4-hydrogen-high",
    owned_by: "google-code-assist",
    provider: "antigravity",
    pricing: { input_per_million: 0, output_per_million: 0, free_tier: true },
    context_length: 1048576,
    max_output_tokens: 262144,
  },
  {
    id: "antigravity/gemini-4-hydrogen-xhigh",
    owned_by: "google-code-assist",
    provider: "antigravity",
    pricing: { input_per_million: 0, output_per_million: 0, free_tier: true },
    context_length: 1048576,
    max_output_tokens: 262144,
  },
  {
    id: "antigravity/gemini-4-hydrogen-sonar",
    owned_by: "google-code-assist",
    provider: "antigravity",
    pricing: { input_per_million: 0, output_per_million: 0, free_tier: true },
    context_length: 1048576,
    max_output_tokens: 65536,
  },
  {
    id: "antigravity/gemini-2.5-pro",
    owned_by: "google-code-assist",
    provider: "antigravity",
    pricing: { input_per_million: 0, output_per_million: 0, free_tier: true },
    context_length: 1048576,
  },
  {
    id: "antigravity/gemini-2.5-flash",
    owned_by: "google-code-assist",
    provider: "antigravity",
    pricing: { input_per_million: 0, output_per_million: 0, free_tier: true },
    context_length: 1048576,
  },
  {
    id: "antigravity/claude-3-7-sonnet",
    owned_by: "google-code-assist",
    provider: "antigravity",
    pricing: { input_per_million: 0, output_per_million: 0, free_tier: true },
    context_length: 200000,
  },

  // --- Groq (Ultra-Rápido 500+ t/s / Free Tier: 14.4k req/dia) ---
  {
    id: "llama-3.3-70b-versatile",
    owned_by: "groq",
    provider: "groq",
    pricing: { input_per_million: 0, output_per_million: 0, free_tier: true },
    context_length: 131072,
  },
  {
    id: "llama-3.1-8b-instant",
    owned_by: "groq",
    provider: "groq",
    pricing: { input_per_million: 0, output_per_million: 0, free_tier: true },
    context_length: 131072,
  },

  // --- Cerebras (Velocidade Máxima 2.000 t/s / 1M tokens/dia grátis) ---
  {
    id: "cerebras/llama3.3-70b",
    owned_by: "cerebras",
    provider: "cerebras",
    pricing: { input_per_million: 0, output_per_million: 0, free_tier: true },
    context_length: 131072,
  },

  // --- Cloudflare Workers AI (Nativo Serverless, 10.000 Neurônios/dia grátis) ---
  {
    id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    owned_by: "cloudflare",
    provider: "cloudflare-ai",
    pricing: { input_per_million: 0, output_per_million: 0, free_tier: true },
    context_length: 131072,
  },
  {
    id: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
    owned_by: "cloudflare",
    provider: "cloudflare-ai",
    pricing: { input_per_million: 0, output_per_million: 0, free_tier: true },
    context_length: 32768,
  },

  // --- OpenRouter Free Tier ---
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    owned_by: "openrouter",
    provider: "openrouter",
    pricing: { input_per_million: 0, output_per_million: 0, free_tier: true },
    context_length: 131072,
  },
  {
    id: "deepseek/deepseek-r1:free",
    owned_by: "openrouter",
    provider: "openrouter",
    pricing: { input_per_million: 0, output_per_million: 0, free_tier: true },
    context_length: 65536,
  },

  // --- Pollinations.ai (Keyless & Sem Limite) ---
  {
    id: "pollinations/openai",
    owned_by: "pollinations",
    provider: "pollinations",
    pricing: { input_per_million: 0, output_per_million: 0, free_tier: true },
    context_length: 65536,
  },

  // --- Combos Inteligentes Oficiais ---
  {
    id: "omni-free",
    owned_by: "veroroute",
    provider: "combo",
    pricing: { input_per_million: 0, output_per_million: 0, free_tier: true },
    context_length: 131072,
  },
  {
    id: "omni-code",
    owned_by: "veroroute",
    provider: "combo",
    pricing: { input_per_million: 0, output_per_million: 0, free_tier: true },
    context_length: 131072,
  },
  {
    id: "omni-fast",
    owned_by: "veroroute",
    provider: "combo",
    pricing: { input_per_million: 0, output_per_million: 0, free_tier: true },
    context_length: 131072,
  },
];
