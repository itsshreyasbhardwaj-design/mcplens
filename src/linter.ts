export type LintSeverity = "error" | "warning" | "info";

export type LintFinding = {
  severity: LintSeverity;
  target: string;
  rule: string;
  message: string;
};

type ToolLike = {
  name: string;
  description?: string;
  inputSchema: {
    type?: string;
    properties?: Record<string, JsonSchemaProp>;
    required?: string[];
  };
};

type JsonSchemaProp = {
  type?: string | string[];
  description?: string;
  enum?: unknown[];
  properties?: Record<string, JsonSchemaProp>;
  items?: unknown;
};

type ResourceLike = {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
};

type PromptLike = {
  name: string;
  description?: string;
  arguments?: Array<{ name: string; description?: string; required?: boolean }>;
};

const VAGUE_NAME_RE = /^(do|run|exec|handle|process|action|thing|stuff|misc)$/i;
const GENERIC_DESCRIPTIONS = new Set(["tool", "a tool", "does something", "n/a", "todo", "tbd"]);

export function lintTools(tools: ToolLike[]): LintFinding[] {
  const findings: LintFinding[] = [];
  const seenNames = new Map<string, number>();

  for (const tool of tools) {
    seenNames.set(tool.name, (seenNames.get(tool.name) ?? 0) + 1);

    if (!tool.description || tool.description.trim().length === 0) {
      findings.push({
        severity: "error",
        target: tool.name,
        rule: "tool-missing-description",
        message: `Tool "${tool.name}" has no description. Models pick tools based on the description — an empty one makes correct tool selection unlikely.`,
      });
    } else if (tool.description.trim().length < 10 || GENERIC_DESCRIPTIONS.has(tool.description.trim().toLowerCase())) {
      findings.push({
        severity: "warning",
        target: tool.name,
        rule: "tool-vague-description",
        message: `Tool "${tool.name}" has a very short or generic description ("${tool.description}"). Consider explaining when to use it and what it returns.`,
      });
    }

    if (VAGUE_NAME_RE.test(tool.name)) {
      findings.push({
        severity: "warning",
        target: tool.name,
        rule: "tool-vague-name",
        message: `Tool name "${tool.name}" is generic. Prefer specific, verb-based names (e.g. "search_flights" not "run").`,
      });
    }

    const schema = tool.inputSchema;
    if (schema?.type !== "object") {
      findings.push({
        severity: "error",
        target: tool.name,
        rule: "tool-schema-not-object",
        message: `Tool "${tool.name}" inputSchema.type is "${schema?.type}", expected "object" per the MCP spec.`,
      });
    }

    const properties = schema?.properties ?? {};
    const required = new Set(schema?.required ?? []);

    for (const [propName, prop] of Object.entries(properties)) {
      if (!prop.description) {
        findings.push({
          severity: "info",
          target: `${tool.name}.${propName}`,
          rule: "param-missing-description",
          message: `Parameter "${propName}" on tool "${tool.name}" has no description, making it harder for a model to fill in correctly.`,
        });
      }
      if (!prop.type && !prop.enum) {
        findings.push({
          severity: "warning",
          target: `${tool.name}.${propName}`,
          rule: "param-missing-type",
          message: `Parameter "${propName}" on tool "${tool.name}" declares no type or enum, so any value is technically valid.`,
        });
      }
      if (prop.type === "array" && prop.items === undefined) {
        findings.push({
          severity: "warning",
          target: `${tool.name}.${propName}`,
          rule: "array-missing-items",
          message: `Parameter "${propName}" on tool "${tool.name}" is an array with no "items" schema, so its element type is unconstrained.`,
        });
      }
      if (prop.enum && prop.enum.length === 1) {
        findings.push({
          severity: "info",
          target: `${tool.name}.${propName}`,
          rule: "enum-single-value",
          message: `Parameter "${propName}" on tool "${tool.name}" has an enum with a single value. If it's always the same, consider dropping the parameter.`,
        });
      }
    }

    if (Object.keys(properties).length === 0 && schema?.type === "object") {
      findings.push({
        severity: "info",
        target: tool.name,
        rule: "tool-no-params",
        message: `Tool "${tool.name}" takes no parameters. Confirm this is intentional rather than an incomplete schema.`,
      });
    }

    for (const req of required) {
      if (!(req in properties)) {
        findings.push({
          severity: "error",
          target: tool.name,
          rule: "required-param-undeclared",
          message: `Tool "${tool.name}" lists "${req}" as required but it is not defined in properties.`,
        });
      }
    }
  }

  for (const [name, count] of seenNames) {
    if (count > 1) {
      findings.push({
        severity: "error",
        target: name,
        rule: "duplicate-tool-name",
        message: `Tool name "${name}" is registered ${count} times. Duplicate names are ambiguous to clients.`,
      });
    }
  }

  return findings;
}

export function lintResources(resources: ResourceLike[]): LintFinding[] {
  const findings: LintFinding[] = [];
  for (const resource of resources) {
    if (!resource.description) {
      findings.push({
        severity: "info",
        target: resource.uri,
        rule: "resource-missing-description",
        message: `Resource "${resource.uri}" has no description.`,
      });
    }
    if (!resource.mimeType) {
      findings.push({
        severity: "info",
        target: resource.uri,
        rule: "resource-missing-mimetype",
        message: `Resource "${resource.uri}" declares no mimeType; clients may not know how to render its contents.`,
      });
    }
  }
  return findings;
}

export function lintPrompts(prompts: PromptLike[]): LintFinding[] {
  const findings: LintFinding[] = [];
  for (const prompt of prompts) {
    if (!prompt.description) {
      findings.push({
        severity: "warning",
        target: prompt.name,
        rule: "prompt-missing-description",
        message: `Prompt "${prompt.name}" has no description, making it harder for a client to decide when to surface it.`,
      });
    }
    for (const arg of prompt.arguments ?? []) {
      if (!arg.description) {
        findings.push({
          severity: "info",
          target: `${prompt.name}.${arg.name}`,
          rule: "prompt-arg-missing-description",
          message: `Argument "${arg.name}" on prompt "${prompt.name}" has no description.`,
        });
      }
    }
  }
  return findings;
}

export function severityRank(s: LintSeverity): number {
  return s === "error" ? 0 : s === "warning" ? 1 : 2;
}
