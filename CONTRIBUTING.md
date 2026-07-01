# Contributing to mcplens

Thanks for considering a contribution. This project is small and intentionally so — please read this before opening a PR.

## Getting started

```bash
git clone https://github.com/itsshreyasbhardwaj-design/mcplens.git
cd mcplens
npm install
npm run build
npm test
```

Try commands against the bundled fixture servers without installing anything globally:

```bash
node dist/cli.js list "node dist/fixtures/example-server.js"
node dist/fixtures/example-http-server.js &   # then in another shell:
node dist/cli.js list "http://localhost:8731/"
```

## Project layout

- `src/connector.ts` — connects to a server target (stdio command or HTTP(S) URL)
- `src/linter.ts` — pure functions implementing the lint rules; no I/O
- `src/commands/*.ts` — one file per CLI subcommand
- `src/cli.ts` — command wiring (commander)
- `src/fixtures/*.ts` — example MCP servers used for manual testing and CI

## Adding a lint rule

Lint rules live in `src/linter.ts` as plain functions over already-fetched tool/resource/prompt objects — they don't talk to a server directly, which keeps them fast to unit test. When adding a rule:

1. Pick a `severity`: `error` for things that will actively break tool selection or violate the spec, `warning` for things that likely hurt quality, `info` for stylistic nits.
2. Give the rule a short, stable `rule` id (used for filtering/suppression later) — don't rename existing rule ids, that's a breaking change for anyone scripting against `--json` output.
3. Add a test in `src/linter.test.ts` covering both the flagged and the clean case.

## Before opening a PR

- `npm run build` and `npm test` must pass.
- If you touched a command's output format, update the corresponding example in `README.md`.
- Keep changes scoped — this project prefers several small PRs over one large one.

## Reporting issues

Please include the exact `mcplens` command you ran, the server you ran it against (or a minimal repro server), and the actual vs. expected output.
