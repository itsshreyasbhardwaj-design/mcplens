import { readFile, writeFile } from "node:fs/promises";
import chalk from "chalk";
import { callTool, type CallResult } from "./call.js";

export type SessionStep = { tool: string; args: Record<string, unknown> };
export type SessionFile = { server: string; steps: SessionStep[] };
export type RecordedStep = SessionStep & { result: unknown; ok: boolean; error?: string };
export type RecordedSession = { server: string; recordedAt: string; steps: RecordedStep[] };

/** Records a fixed sequence of tool calls against a live server into a JSON snapshot for later diffing. */
export async function recordCommand(rawTarget: string, planPath: string, outPath: string) {
  const plan: SessionFile = JSON.parse(await readFile(planPath, "utf-8"));

  const steps: RecordedStep[] = [];
  for (const step of plan.steps) {
    const outcome = await callTool(rawTarget, step.tool, JSON.stringify(step.args));
    steps.push({ tool: step.tool, args: step.args, result: outcome.result, ok: outcome.ok, error: outcome.error });
    console.log(`${outcome.ok ? chalk.green("ok") : chalk.red("fail")}  ${step.tool}(${JSON.stringify(step.args)})`);
  }

  const recorded: RecordedSession = { server: rawTarget, recordedAt: new Date().toISOString(), steps };
  await writeFile(outPath, JSON.stringify(recorded, null, 2));
  console.log(chalk.dim(`\nSaved ${steps.length} step(s) to ${outPath}`));
}

/** Replays a previously recorded session against a (possibly changed) server and reports divergence. */
export async function replayCommand(rawTarget: string, snapshotPath: string, opts: { json?: boolean }) {
  const baseline: RecordedSession = JSON.parse(await readFile(snapshotPath, "utf-8"));

  let mismatches = 0;
  const report: Array<{ tool: string; args: Record<string, unknown>; changed: boolean; before: unknown; after: unknown }> = [];

  for (const step of baseline.steps) {
    const outcome = await callTool(rawTarget, step.tool, JSON.stringify(step.args));
    const before = JSON.stringify(step.ok ? step.result : { error: step.error });
    const after = JSON.stringify(outcome.ok ? outcome.result : { error: outcome.error });
    const changed = before !== after;
    if (changed) mismatches++;
    report.push({ tool: step.tool, args: step.args, changed, before: step.ok ? step.result : step.error, after: outcome.ok ? outcome.result : outcome.error });
  }

  if (opts.json) {
    console.log(JSON.stringify({ mismatches, report }, null, 2));
  } else {
    for (const r of report) {
      if (r.changed) {
        console.log(chalk.red(`\n[CHANGED] ${r.tool}(${JSON.stringify(r.args)})`));
        console.log(chalk.dim("  before: ") + JSON.stringify(r.before));
        console.log(chalk.dim("  after:  ") + JSON.stringify(r.after));
      } else {
        console.log(chalk.green(`[match]   ${r.tool}(${JSON.stringify(r.args)})`));
      }
    }
    console.log(
      mismatches === 0
        ? chalk.green(`\nAll ${report.length} step(s) match the baseline.`)
        : chalk.red(`\n${mismatches}/${report.length} step(s) diverged from the baseline.`)
    );
  }

  if (mismatches > 0) process.exitCode = 1;
}
