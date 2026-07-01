import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export type ServerTarget = {
  command: string;
  args: string[];
};

export type ConnectedServer = {
  client: Client;
  disconnect: () => Promise<void>;
};

/** Parses a `mcplens` server target string like `node server.js --flag` into a spawnable command. */
export function parseServerTarget(raw: string): ServerTarget {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    throw new Error("Server command cannot be empty");
  }
  const [command, ...args] = parts;
  return { command, args };
}

export async function connectStdio(target: ServerTarget): Promise<ConnectedServer> {
  const transport = new StdioClientTransport({
    command: target.command,
    args: target.args,
  });

  const client = new Client({ name: "mcplens", version: "0.1.0" }, { capabilities: {} });

  await client.connect(transport);

  return {
    client,
    disconnect: async () => {
      await client.close();
    },
  };
}
