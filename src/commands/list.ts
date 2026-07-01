import chalk from "chalk";
import { connectServer, parseServerTarget } from "../connector.js";

export async function listCommand(rawTarget: string, opts: { json?: boolean }) {
  const target = parseServerTarget(rawTarget);
  const { client, disconnect } = await connectServer(target);

  try {
    const [tools, resources, prompts] = await Promise.all([
      client.listTools().catch(() => ({ tools: [] as const })),
      client.listResources().catch(() => ({ resources: [] as const })),
      client.listPrompts().catch(() => ({ prompts: [] as const })),
    ]);

    if (opts.json) {
      console.log(JSON.stringify({ tools: tools.tools, resources: resources.resources, prompts: prompts.prompts }, null, 2));
      return;
    }

    const version = client.getServerVersion();
    console.log(chalk.bold(`\nServer: ${version?.name ?? "unknown"} v${version?.version ?? "?"}\n`));

    console.log(chalk.bold.cyan(`Tools (${tools.tools.length})`));
    for (const tool of tools.tools) {
      const props = tool.inputSchema.properties ? Object.keys(tool.inputSchema.properties) : [];
      console.log(`  ${chalk.green(tool.name)}${tool.description ? chalk.dim(" - " + tool.description) : chalk.dim(" (no description)")}`);
      if (props.length) console.log(`    ${chalk.dim("params:")} ${props.join(", ")}`);
    }

    console.log(chalk.bold.cyan(`\nResources (${resources.resources.length})`));
    for (const r of resources.resources) {
      console.log(`  ${chalk.green(r.uri)}${r.description ? chalk.dim(" - " + r.description) : ""}`);
    }

    console.log(chalk.bold.cyan(`\nPrompts (${prompts.prompts.length})`));
    for (const p of prompts.prompts) {
      console.log(`  ${chalk.green(p.name)}${p.description ? chalk.dim(" - " + p.description) : ""}`);
    }
    console.log();
  } finally {
    await disconnect();
  }
}
