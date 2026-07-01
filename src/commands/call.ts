import chalk from "chalk";
import { connectServer, parseServerTarget } from "../connector.js";

export type CallResult = {
  tool: string;
  args: Record<string, unknown>;
  durationMs: number;
  ok: boolean;
  result?: unknown;
  error?: string;
};

export async function callTool(rawTarget: string, toolName: string, argsJson: string): Promise<CallResult> {
  const target = parseServerTarget(rawTarget);
  const { client, disconnect } = await connectServer(target);

  let args: Record<string, unknown> = {};
  if (argsJson && argsJson.trim().length > 0) {
    try {
      args = JSON.parse(argsJson);
    } catch (e) {
      await disconnect();
      throw new Error(`--args must be valid JSON: ${(e as Error).message}`);
    }
  }

  const started = performance.now();
  try {
    const result = await client.callTool({ name: toolName, arguments: args });
    const durationMs = performance.now() - started;
    const isError = (result as { isError?: boolean }).isError === true;
    if (isError) {
      return { tool: toolName, args, durationMs, ok: false, error: extractErrorText(result), result };
    }
    return { tool: toolName, args, durationMs, ok: true, result };
  } catch (e) {
    const durationMs = performance.now() - started;
    return { tool: toolName, args, durationMs, ok: false, error: (e as Error).message };
  } finally {
    await disconnect();
  }
}

function extractErrorText(result: unknown): string {
  const content = (result as { content?: Array<{ type: string; text?: string }> }).content;
  const text = content?.find((c) => c.type === "text")?.text;
  return text ?? "Tool returned isError: true with no text content";
}

export async function callCommand(rawTarget: string, toolName: string, opts: { args?: string; json?: boolean }) {
  const outcome = await callTool(rawTarget, toolName, opts.args ?? "{}");

  if (opts.json) {
    console.log(JSON.stringify(outcome, null, 2));
    return;
  }

  console.log(chalk.bold(`\nCalled ${chalk.cyan(outcome.tool)} with ${JSON.stringify(outcome.args)}`));
  console.log(chalk.dim(`  duration: ${outcome.durationMs.toFixed(1)}ms`));

  if (outcome.ok) {
    console.log(chalk.green("  status: ok"));
    console.log(JSON.stringify(outcome.result, null, 2));
  } else {
    console.log(chalk.red("  status: error"));
    console.log(chalk.red(`  ${outcome.error ?? "unknown error"}`));
    process.exitCode = 1;
  }
}
