/**
 * Constantes Globais, Credenciais Públicas OAuth e Catálogo do VeroRoute Edge
 */

// Credenciais Públicas Oficiais do Google Cloud Code Assist (Antigravity CLI / agy)
export const ANTIGRAVITY_PUBLIC_CONFIG = {
  clientId: "YOUR_GOOGLE_CLIENT_ID_HERE",
  clientSecret: "YOUR_GOOGLE_CLIENT_SECRET_HERE",
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
  runtimeBaseUrl: "https://cloudcode-pa.googleapis.com",
  loadCodeAssistPath: "/v1internal:loadCodeAssist",
  onboardUserPath: "/v1internal:onboardUser",
  modelsDiscoveryPath: "/v1internal:models",
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

// Catálogo de modelos suportados pelo VeroRoute Edge
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

// Combos Padrão com Fallback e Estratégia
export const DEFAULT_COMBOS = {
  "omni-free": {
    name: "Omni Free Tier Cascade",
    strategy: "priority",
    targets: [
      { provider: "gemini", model: "gemini-2.5-flash" },
      { provider: "groq", model: "llama-3.3-70b-versatile" },
      { provider: "cerebras", model: "llama3.3-70b" },
      { provider: "alibaba", model: "qwen-plus" },
      { provider: "cloudflare-ai", model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast" },
      { provider: "openrouter", model: "meta-llama/llama-3.3-70b-instruct:free" },
      { provider: "pollinations", model: "openai" },
    ],
  },
  "omni-code": {
    name: "Omni Coding Specialist",
    strategy: "priority",
    targets: [
      { provider: "antigravity", model: "gemini-2.5-pro" },
      { provider: "1min", model: "1min/gpt-4o" },
      { provider: "alibaba", model: "qwen2.5-coder-32b-instruct" },
      { provider: "cloudflare-ai", model: "@cf/qwen/qwen2.5-coder-32b-instruct" },
      { provider: "groq", model: "llama-3.3-70b-versatile" },
      { provider: "cerebras", model: "llama3.3-70b" },
    ],
  },
  "omni-fast": {
    name: "Omni Speed Champions (500-2000 t/s)",
    strategy: "p2c",
    targets: [
      { provider: "cerebras", model: "llama3.3-70b" },
      { provider: "groq", model: "llama-3.3-70b-versatile" },
    ],
  },
};
