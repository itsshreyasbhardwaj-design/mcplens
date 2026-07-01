import assert from "node:assert/strict";
import { test } from "node:test";
import { lintPrompts, lintResources, lintTools } from "./linter.js";

test("flags a tool with no description as an error", () => {
  const findings = lintTools([
    { name: "echo", inputSchema: { type: "object", properties: { message: { type: "string" } } } },
  ]);
  const rules = findings.map((f) => f.rule);
  assert.ok(rules.includes("tool-missing-description"));
});

test("does not flag a well-described tool", () => {
  const findings = lintTools([
    {
      name: "search_flights",
      description: "Search for flights between two airports on a given date.",
      inputSchema: {
        type: "object",
        properties: {
          origin: { type: "string", description: "IATA origin airport code" },
          destination: { type: "string", description: "IATA destination airport code" },
        },
        required: ["origin", "destination"],
      },
    },
  ]);
  assert.equal(findings.length, 0);
});

test("flags a required param that is not declared in properties", () => {
  const findings = lintTools([
    {
      name: "book",
      description: "Books something.",
      inputSchema: { type: "object", properties: {}, required: ["flightId"] },
    },
  ]);
  assert.ok(findings.some((f) => f.rule === "required-param-undeclared"));
});

test("flags duplicate tool names", () => {
  const tool = {
    name: "add",
    description: "Adds two numbers.",
    inputSchema: { type: "object", properties: { a: { type: "number" }, b: { type: "number" } } },
  };
  const findings = lintTools([tool, tool]);
  assert.ok(findings.some((f) => f.rule === "duplicate-tool-name"));
});

test("flags a non-object input schema", () => {
  const findings = lintTools([
    { name: "weird", description: "Weird schema.", inputSchema: { type: "string" } as never },
  ]);
  assert.ok(findings.some((f) => f.rule === "tool-schema-not-object"));
});

test("flags resources missing description and mimeType", () => {
  const findings = lintResources([{ uri: "file://foo" }]);
  assert.equal(findings.length, 2);
});

test("flags an array parameter with no items schema", () => {
  const findings = lintTools([
    {
      name: "tag_items",
      description: "Tags a list of items.",
      inputSchema: { type: "object", properties: { tags: { type: "array", description: "Tags to apply" } } },
    },
  ]);
  assert.ok(findings.some((f) => f.rule === "array-missing-items"));
});

test("flags a single-value enum", () => {
  const findings = lintTools([
    {
      name: "set_mode",
      description: "Sets the operating mode.",
      inputSchema: {
        type: "object",
        properties: { mode: { description: "Mode to set", enum: ["only-option"] } },
      },
    },
  ]);
  assert.ok(findings.some((f) => f.rule === "enum-single-value"));
});

test("flags prompts and prompt arguments missing descriptions", () => {
  const findings = lintPrompts([{ name: "summarize", arguments: [{ name: "text" }] }]);
  assert.ok(findings.some((f) => f.rule === "prompt-missing-description"));
  assert.ok(findings.some((f) => f.rule === "prompt-arg-missing-description"));
});
