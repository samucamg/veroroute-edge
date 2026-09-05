import { dispatchSearch } from "@/search/dispatcher";
import { fetchWithJinaReader } from "@/search/jina";
import { PROVIDER_REGISTRY } from "@/config/providers";
import type { EnvBindings } from "@/types/provider";

/**
 * Ferramentas expostas pelo Servidor MCP do VeroRoute Edge
 */
export const MCP_TOOLS_LIST = [
  {
    name: "web_search",
    description: "Pesquisa na web em tempo real via SearXNG, DuckDuckGo ou Tavily",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Termo de busca" },
        limit: { type: "number", description: "Número de resultados (1-10)" },
      },
      required: ["query"],
    },
  },
  {
    name: "web_fetch",
    description: "Extrai e converte qualquer página web para Markdown estruturado e limpo",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL da página a ser extraída" },
      },
      required: ["url"],
    },
  },
  {
    name: "list_providers",
    description: "Lista todos os provedores e modelos ativos no VeroRoute Edge",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

/**
 * Executa uma ferramenta MCP solicitada
 */
export async function executeMcpTool(
  name: string,
  args: Record<string, any>,
  env: EnvBindings
): Promise<any> {
  switch (name) {
    case "web_search": {
      const searchRes = await dispatchSearch(
        { query: args.query, limit: args.limit || 5 },
        env
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(searchRes.results, null, 2),
          },
        ],
      };
    }

    case "web_fetch": {
      const page = await fetchWithJinaReader(args.url);
      return {
        content: [
          {
            type: "text",
            text: page.content,
          },
        ],
      };
    }

    case "list_providers": {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(PROVIDER_REGISTRY, null, 2),
          },
        ],
      };
    }

    default:
      throw new Error(`Ferramenta MCP desconhecida: ${name}`);
  }
}

/**
 * Handler para conexões MCP via Server-Sent Events (SSE)
 */
export function handleMcpSse(env: EnvBindings): Response {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    // Inicialização do protocolo MCP SSE
    const endpointEvent = `event: endpoint\ndata: /api/mcp/messages\n\n`;
    await writer.write(encoder.encode(endpointEvent));

    const toolsEvent = `event: message\ndata: ${JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/tools/list_changed",
      params: {},
    })}\n\n`;
    await writer.write(encoder.encode(toolsEvent));
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
