/**
 * Tipos e interfaces padrão para compatibilidade com OpenAI v1
 */

export interface ChatMessageContentPartText {
  type: "text";
  text: string;
}

export interface ChatMessageContentPartImage {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
}

export type ChatMessageContentPart = ChatMessageContentPartText | ChatMessageContentPartImage;

export interface ToolCallFunction {
  name: string;
  arguments: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: ToolCallFunction;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | ChatMessageContentPart[];
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ChatCompletionTool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  stop?: string | string[];
  presence_penalty?: number;
  frequency_penalty?: number;
  tools?: ChatCompletionTool[];
  tool_choice?: string | Record<string, unknown>;
  response_format?: { type: "text" | "json_object" | "json_schema"; json_schema?: unknown };
  user?: string;
  // Campos avançados e extensões do OmniRoute
  routing_strategy?: string;
  output_style?: string;
  enable_search?: boolean;
  search_provider?: string;
  fallbacks?: string[];
  compression?: boolean;
}

export interface ChatCompletionChoice {
  index: number;
  message: {
    role: "assistant";
    content: string | null;
    tool_calls?: ToolCall[];
  };
  finish_reason: "stop" | "length" | "tool_calls" | "content_filter" | null;
}

export interface ChatCompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: ChatCompletionUsage;
  system_fingerprint?: string;
}

export interface ChatCompletionChunkChoice {
  index: number;
  delta: {
    role?: "assistant";
    content?: string | null;
    tool_calls?: Array<{
      index: number;
      id?: string;
      type?: "function";
      function?: {
        name?: string;
        arguments?: string;
      };
    }>;
  };
  finish_reason: "stop" | "length" | "tool_calls" | "content_filter" | null;
}

export interface ChatCompletionChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: ChatCompletionChunkChoice[];
  usage?: ChatCompletionUsage;
}

export interface ModelInfo {
  id: string;
  object: "model";
  created: number;
  owned_by: string;
  permission?: unknown[];
  root?: string;
  parent?: string | null;
  pricing?: {
    input_per_million?: number;
    output_per_million?: number;
    free_tier?: boolean;
  };
  context_length?: number;
  provider?: string;
}

export interface ModelsResponse {
  object: "list";
  data: ModelInfo[];
}
