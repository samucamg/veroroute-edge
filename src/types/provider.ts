/**
 * Definições e interfaces de Provedores e Ambiente Cloudflare Workers
 */

export type ProviderId =
  | "openai"
  | "azure"
  | "bedrock"
  | "alibaba"
  | "gemini"
  | "groq"
  | "cerebras"
  | "cloudflare-ai"
  | "antigravity"
  | "1min"
  | "freeapikey"
  | "openrouter"
  | "sambanova"
  | "mistral"
  | "deepseek"
  | "pollinations"
  | "custom";

export type RoutingStrategy =
  | "priority"
  | "weighted"
  | "round-robin"
  | "p2c"
  | "fill-first"
  | "least-used"
  | "cost"
  | "reset-aware"
  | "lkgp"
  | "session-affinity"
  | "auto-combo";

export type OutputStyle =
  | "none"
  | "concise"
  | "yagni"
  | "ponytail"
  | "action-first";

export interface ProviderHealthState {
  isBlocked: boolean;
  blockedUntil?: number; // timestamp ms
  lastErrorStatus?: number;
  lastErrorMessage?: string;
  consecutiveFailures: number;
  successCount: number;
  totalCalls: number;
  totalTokensProcessed: number;
  avgLatencyMs: number;
}

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  baseUrl?: string;
  authType: "bearer" | "apikey-header" | "query" | "oauth" | "native-binding";
  headerName?: string;
  models: string[];
  freeTier: boolean;
  costPerMillionInput: number;
  costPerMillionOutput: number;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  rpmLimit?: number;
}

export interface ComboRule {
  id: string;
  name: string;
  alias: string;
  strategy: RoutingStrategy;
  providers: Array<{
    provider: ProviderId;
    model: string;
    weight?: number;
  }>;
}

export interface EnvBindings {
  // Bindings Cloudflare
  AI?: {
    run: (model: string, input: Record<string, unknown>) => Promise<any>;
  };
  OMNI_CACHE?: KVNamespace;
  OMNI_KEYS?: KVNamespace;
  DB?: D1Database;

  // Variáveis de Ambiente
  AUTH_TOKEN?: string;
  DEFAULT_ROUTING_STRATEGY?: string;
  DEFAULT_OUTPUT_STYLE?: string;
  SEARXNG_URL?: string; // URL customizada do usuário para SearXNG
  ENABLE_MODALITY_BRIDGE?: string;
  ENABLE_CONTEXT_COMPRESSION?: string;
  ENABLE_JINA_READER?: string;
  ENABLE_MCP_SERVER?: string;
  ENABLE_QUOTA_SHARING?: string;
  MAX_RETRIES?: string;
  RETRY_DELAY_MS?: string;

  // Chaves de Provedores Corporativos & Populares
  OPENAI_API_KEYS?: string;
  AZURE_OPENAI_API_KEYS?: string;
  AZURE_OPENAI_ENDPOINT?: string;
  BEDROCK_API_KEYS?: string;
  ALIBABA_API_KEYS?: string;
  ONE_MIN_API_KEYS?: string;
  FREEAPIKEY_KEYS?: string;

  // Chaves de Provedores Gratuitos de Alta Capacidade
  GEMINI_API_KEYS?: string;
  GROQ_API_KEYS?: string;
  CEREBRAS_API_KEYS?: string;
  SAMBANOVA_API_KEYS?: string;
  MISTRAL_API_KEYS?: string;
  OPENROUTER_API_KEYS?: string;
  DEEPSEEK_API_KEYS?: string;
  POLLINATIONS_API_KEYS?: string;
  TAVILY_API_KEYS?: string;
  SERPER_API_KEYS?: string;
  FIRECRAWL_API_KEYS?: string;

  // Credenciais Antigravity / Google Cloud Code Assist
  ANTIGRAVITY_CLIENT_ID?: string;
  ANTIGRAVITY_CLIENT_SECRET?: string;
  ANTIGRAVITY_REFRESH_TOKEN?: string;
  ANTIGRAVITY_PROJECT_ID?: string;
  ANTIGRAVITY_ACCESS_TOKEN?: string;
}
