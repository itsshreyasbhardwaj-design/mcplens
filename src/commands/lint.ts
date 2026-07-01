import chalk from "chalk";
import { connectStdio, parseServerTarget } from "../connector.js";
import { lintResources, lintTools, severityRank, type LintFinding } from "../linter.js";

const SEVERITY_COLOR: Record<LintFinding["severity"], (s: string) => string> = {
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.dim,
};

export async function lintCommand(rawTarget: string, opts: { json?: boolean; failOn?: string }) {
  const target = parseServerTarget(rawTarget);
  const { client, disconnect } = await connectStdio(target);

  try {
    const [toolsRes, resourcesRes] = await Promise.all([
      client.listTools().catch(() => ({ tools: [] })),
      client.listResources().catch(() => ({ resources: [] })),
    ]);

    const findings = [...lintTools(toolsRes.tools), ...lintResources(resourcesRes.resources)].sort(
      (a, b) => severityRank(a.severity) - severityRank(b.severity)
    );

    if (opts.json) {
      console.log(JSON.stringify(findings, null, 2));
    } else if (findings.length === 0) {
      console.log(chalk.green("No issues found. Schemas look clean."));
    } else {
      console.log(chalk.bold(`\n${findings.length} finding(s):\n`));
      for (const f of findings) {
        const color = SEVERITY_COLOR[f.severity];
        console.log(`${color(`[${f.severity.toUpperCase()}]`)} ${chalk.bold(f.target)} ${chalk.dim(`(${f.rule})`)}`);
        console.log(`  ${f.message}\n`);
      }
    }

    const errorCount = findings.filter((f) => f.severity === "error").length;
    const warningCount = findings.filter((f) => f.severity === "warning").length;
    const failOn = opts.failOn ?? "error";
    const shouldFail =
      (failOn === "error" && errorCount > 0) || (failOn === "warning" && (errorCount > 0 || warningCount > 0));

    if (shouldFail) {
      process.exitCode = 1;
    }
  } finally {
    await disconnect();
  }
}
