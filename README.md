# mcplens

Inspect, lint, trace, and regression-test [Model Context Protocol](https://modelcontextprotocol.io) (MCP) servers from the command line.

MCP servers are usually debugged by eyeballing logs or poking at them through a client. `mcplens` gives you a fast, scriptable way to see what a server exposes, catch schema problems that make tool-calling unreliable, call tools directly with full request/response tracing, and snapshot a server's behavior so you can tell when it changes.

## Why

If you build or maintain an MCP server, you've probably hit one of these:

- A tool works fine when you call it directly but the model never picks it — usually because the description or parameter schema is vague.
- You change a server and have no fast way to know if existing tool calls still behave the same way.
- You want to see the raw request/response for a tool call without wiring up a full client.

`mcplens` is a small, dependency-light CLI focused on exactly these problems. It's not a hosted platform — it runs entirely on your machine, against any stdio-based MCP server.

## Install

```bash
npm install -g mcplens
```

Or run from source:

```bash
git clone https://github.com/<you>/mcplens.git
cd mcplens
npm install
npm run build
node dist/cli.js --help
```

## Usage

All commands take a server target — either the shell command used to launch your MCP server over stdio (as a single quoted string), or an `http://`/`https://` URL for a server speaking Streamable HTTP or SSE:

```bash
mcplens list "node my-server.js"
mcplens list "http://localhost:3000/mcp"
```

### `list` — see what a server exposes

```bash
mcplens list "node my-server.js"
```

```
Server: my-server v1.0.0

Tools (3)
  add - Add two numbers together
    params: a, b
  echo (no description)
    params: message

Resources (1)
  greeting://hello - A static greeting resource
```

Add `--json` for machine-readable output.

### `lint` — catch schema issues before the model does

```bash
mcplens lint "node my-server.js"
```

```
1 finding(s):

[ERROR] echo (tool-missing-description)
  Tool "echo" has no description. Models pick tools based on the
  description — an empty one makes correct tool selection unlikely.
```

Checks include: missing/vague tool descriptions, vague tool names, non-`object` input schemas, undeclared required parameters, missing parameter types/descriptions, duplicate tool names, and missing resource metadata.

Exits non-zero on errors by default — use `--fail-on warning` to be stricter, useful in CI.

### `call` — call a tool with full tracing

```bash
mcplens call "node my-server.js" add --args '{"a": 2, "b": 3}'
```

```
Called add with {"a":2,"b":3}
  duration: 2.5ms
  status: ok
{
  "content": [{ "type": "text", "text": "5" }]
}
```

Errors thrown inside the tool (including MCP's `isError: true` convention) are surfaced with the actual error message and a non-zero exit code.

### `record` / `replay` — regression-test server behavior

Write a plan of tool calls once:

```json
// plan.json
{
  "server": "node my-server.js",
  "steps": [
    { "tool": "add", "args": { "a": 2, "b": 3 } },
    { "tool": "echo", "args": { "message": "hi" } }
  ]
}
```

Record a baseline:

```bash
mcplens record "node my-server.js" --plan plan.json --out baseline.json
```

Later — after refactoring the server, upgrading a dependency, or swapping models — replay it and see exactly what changed:

```bash
mcplens replay "node my-server.js" --snapshot baseline.json
```

```
[CHANGED] add({"a":2,"b":3})
  before: {"content":[{"type":"text","text":"5"}]}
  after:  {"content":[{"type":"text","text":"105"}]}
[match]   echo({"message":"hi"})

1/2 step(s) diverged from the baseline.
```

Exits non-zero on any divergence, so it drops straight into CI.

## Using it as a library

The lint rules and connector are also exported for programmatic use — e.g. to write a custom test that asserts a server has zero lint errors:

```ts
import { connectServer, parseServerTarget, lintTools, lintResources } from "mcplens";

const { client, disconnect } = await connectServer(parseServerTarget("node my-server.js"));
const { tools } = await client.listTools();
const findings = lintTools(tools);
await disconnect();
```

## How it works

`mcplens` connects to your server exactly like any MCP client would, using the official [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) over stdio. It doesn't modify your server or require any special instrumentation — if a real client can talk to it, `mcplens` can too.

## Status

Early — the lint rule set is intentionally small and easy to extend. Contributions and issue reports are welcome.

## License

MIT
