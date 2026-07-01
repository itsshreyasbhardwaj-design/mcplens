import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

export type StdioTarget = { kind: "stdio"; command: string; args: string[] };
export type HttpTarget = { kind: "http"; url: URL };
export type ServerTarget = StdioTarget | HttpTarget;

export type ConnectedServer = {
  client: Client;
  disconnect: () => Promise<void>;
};

/**
 * Parses a server target: either an HTTP(S) URL (Streamable HTTP transport, with SSE
 * fallback for older servers) or a shell command to spawn over stdio, e.g. `node server.js`.
 */
export function parseServerTarget(raw: string): ServerTarget {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new Error("Server target cannot be empty");
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return { kind: "http", url: new URL(trimmed) };
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  const [command, ...args] = parts;
  return { kind: "stdio", command, args };
}

export async function connectServer(target: ServerTarget): Promise<ConnectedServer> {
  if (target.kind === "stdio") {
    return connectWithTransport(new StdioClientTransport({ command: target.command, args: target.args }));
  }

  try {
    return await connectWithTransport(new StreamableHTTPClientTransport(target.url));
  } catch (streamableErr) {
    // Older MCP servers only speak plain SSE; fall back rather than fail outright.
    try {
      return await connectWithTransport(new SSEClientTransport(target.url));
    } catch {
      throw streamableErr;
    }
  }
}

async function connectWithTransport(transport: Transport): Promise<ConnectedServer> {
  const client = new Client({ name: "mcplens", version: "0.1.0" }, { capabilities: {} });
  await client.connect(transport);
  return {
    client,
    disconnect: async () => {
      await client.close();
    },
  };
}

