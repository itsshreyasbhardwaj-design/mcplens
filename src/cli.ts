#!/usr/bin/env node
import { Command } from "commander";
import { listCommand } from "./commands/list.js";
import { lintCommand } from "./commands/lint.js";
import { callCommand } from "./commands/call.js";
import { recordCommand, replayCommand } from "./commands/session.js";

const program = new Command();

program
  .name("mcplens")
  .description("Inspect, lint, trace, and regression-test Model Context Protocol (MCP) servers.")
  .version("0.1.0");

program
  .command("list <server>")
  .description('List tools, resources, and prompts. Example: mcplens list "node server.js"')
  .option("--json", "Output raw JSON instead of formatted text")
  .action(async (server: string, opts) => {
    await listCommand(server, opts);
  });

program
  .command("lint <server>")
  .description("Check tool and resource schemas for issues that hurt model tool-selection accuracy")
  .option("--json", "Output raw JSON instead of formatted text")
  .option("--fail-on <level>", "Exit non-zero on: error (default) or warning", "error")
  .action(async (server: string, opts) => {
    await lintCommand(server, { json: opts.json, failOn: opts.failOn });
  });

program
  .command("call <server> <tool>")
  .description('Call a tool directly. Example: mcplens call "node server.js" add --args \'{"a":1,"b":2}\'')
  .option("--args <json>", "JSON object of arguments to pass to the tool", "{}")
  .option("--json", "Output raw JSON instead of formatted text")
  .action(async (server: string, tool: string, opts) => {
    await callCommand(server, tool, opts);
  });

program
  .command("record <server>")
  .description("Run a JSON plan of tool calls against a server and save the results as a baseline snapshot")
  .requiredOption("--plan <path>", "Path to a JSON file: { server, steps: [{ tool, args }] }")
  .requiredOption("--out <path>", "Path to write the recorded snapshot")
  .action(async (server: string, opts) => {
    await recordCommand(server, opts.plan, opts.out);
  });

program
  .command("replay <server>")
  .description("Re-run a recorded session against a server and report any divergence from the baseline")
  .requiredOption("--snapshot <path>", "Path to a snapshot produced by `mcplens record`")
  .option("--json", "Output raw JSON instead of formatted text")
  .action(async (server: string, opts) => {
    await replayCommand(server, opts.snapshot, opts);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
