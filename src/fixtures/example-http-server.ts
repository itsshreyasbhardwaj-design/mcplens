#!/usr/bin/env node
import { createServer } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const PORT = Number(process.env.MCPLENS_FIXTURE_PORT ?? 8731);

function buildServer() {
  const server = new McpServer({ name: "mcplens-http-fixture", version: "1.0.0" });
  server.registerTool(
    "multiply",
    { description: "Multiply two numbers together", inputSchema: { a: z.number(), b: z.number() } },
    async ({ a, b }) => ({ content: [{ type: "text", text: String(a * b) }] })
  );
  return server;
}

// Stateless mode: each incoming HTTP request gets its own transport + server
// instance, since mcplens opens a fresh connection per CLI invocation rather
// than reusing a session the way a long-lived client would.
const httpServer = createServer(async (req, res) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const mcpServer = buildServer();
  await mcpServer.connect(transport);
  await transport.handleRequest(req, res);
  res.on("close", () => {
    transport.close();
    mcpServer.close();
  });
});

httpServer.listen(PORT, () => {
  console.error(`mcplens HTTP fixture listening on http://localhost:${PORT}/`);
});
