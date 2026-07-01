# Changelog

All notable changes to this project are documented here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - 2026-07-01

### Added
- `list` — enumerate a server's tools, resources, and prompts with schemas
- `lint` — flag schema/description issues that hurt model tool-selection accuracy:
  missing/vague tool descriptions, vague tool names, non-object input schemas,
  undeclared required parameters, missing parameter types/descriptions,
  duplicate tool names, arrays without an `items` schema, single-value enums,
  and missing resource/prompt metadata
- `call` — invoke a tool directly with request/response tracing and timing,
  correctly surfacing both thrown errors and `isError: true` responses
- `record` / `replay` — snapshot a server's tool-call behavior and detect
  regressions, with CI-friendly non-zero exit codes
- Stdio and Streamable HTTP/SSE transport support
- Library entry point (`import { ... } from "mcplens"`) exposing the connector
  and lint functions for programmatic use
- Fixture MCP servers (stdio and HTTP) and a unit test suite for the linter
- GitHub Actions CI workflow
