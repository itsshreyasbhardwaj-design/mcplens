#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "mcplens-fixture", version: "1.0.0" });

server.registerTool(
  "add",
  {
    description: "Add two numbers together",
    inputSchema: { a: z.number(), b: z.number() },
  },
  async ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }],
  })
);

// Intentionally under-specified tool, used to exercise the linter.
server.registerTool(
  "echo",
  {
    inputSchema: { message: z.string() },
  },
  async ({ message }) => ({
    content: [{ type: "text", text: message }],
  })
);

server.registerTool(
  "fail",
  {
    description: "Always throws, for testing error tracing",
    inputSchema: { reason: z.string().optional() },
  },
  async ({ reason }) => {
    throw new Error(reason ?? "intentional failure");
  }
);

server.registerResource(
  "greeting",
  "greeting://hello",
  { description: "A static greeting resource", mimeType: "text/plain" },
  async (uri) => ({
    contents: [{ uri: uri.href, text: "Hello from mcplens fixture server!" }],
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);
