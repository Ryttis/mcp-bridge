# mcp-bridge

`mcp-bridge` is the local agent, recipe, and client layer for the MCP ecosystem. It can run local filesystem recipes directly, and it can call `mcp-server` over WebSocket JSON-RPC for server-backed tools.

## Configuration

- `MCP_SERVER_URL`: optional WebSocket URL for `mcp-server`. Defaults to `ws://localhost:${PORT || 4000}`.
- `AUTH_TOKEN`: optional bridge token. When present, it is passed to the server as a `token` query parameter.
- `OPENAI_API_KEY`: required by `mcp-server` for live LLM and memory workflows. The bridge only needs it for legacy direct OpenAI steps such as `docHeaderTransform`.

## Workflows

- Local scan: `node bridge.js run-recipe-local scan-project .`
- Local coding agent: `node bridge.js agent "<request>" --project /path/to/project`
- Supplier call dry-run: `node bridge.js supplier-call --input ./examples/supplier-campaign.example.json --dry-run`
- Voice test call: `node bridge.js voice-test-call --phone "+37062071053" --dry-run`
- Lithuanian record-mode test call: `node bridge.js voice-test-call --phone "+37062071053" --call --response-mode record --json`
- Kernel recipe call: `node bridge.js run-recipe <name> [path]`
- LLM completion through server: `llmComplete()` calls `core.llmComplete`.
- Memory through server: `memoryQuery` calls `core.memoryQuery`, and `memoryIngest` calls `core.memoryIngest`.

### Supplier call dry-run

The supplier call workflow validates a Lithuanian supplier campaign and prints a planned call script. This first version is dry-run only and does not call any phone, realtime, or LLM provider.

```bash
node bridge.js supplier-call --input ./supplier-campaign.json --dry-run
node bridge.js supplier-call --input ./examples/supplier-campaign.example.json --json --dry-run
```

Campaigns must use `language: "lt-LT"`, include caller and car details, at least one part, and 1-10 sellers. Seller phones must be non-empty E.164 Lithuanian numbers starting with `+370`. Use `--json` when stdout must be parseable JSON only.

### Voice test call

The voice test command calls the server-side RPC method `voice.outboundCall`. It requires exactly one of `--dry-run` or `--call`. Real-call intent is only sent with `--call`; the bridge does not add Twilio code or bypass server gates.

```bash
node bridge.js voice-test-call --phone "+37062071053" --dry-run
node bridge.js voice-test-call --phone "+37062071053" --dry-run --json
node bridge.js voice-test-call --phone "+37062071053" --call --json
node bridge.js voice-test-call --phone "+37062071053" --call --response-mode record --json
node bridge.js voice-status --call-id <callId> --json
node bridge.js voice-result --call-id <callId> --json
node bridge.js voice-transcribe --call-id <callId> --json
```

Phones must look like E.164 numbers, for example `+37062071053`. `--response-mode` defaults to `gather`; `record` is the preferred Lithuanian test path because Twilio speech recognition is not reliable enough for Lithuanian and Twilio `<Say>` pronunciation may be poor. Record mode captures caller audio for an external STT provider later. `voice-transcribe` currently reports disabled/not configured provider state and counts recordings/pending answers; it does not call Google, OpenAI, or Twilio STT. Supplier batch calls remain intentionally disconnected.

### Local coding agent

Start `mcp-server` separately:

```bash
cd /Users/Ryttis/mcp-server
node server.js
```

Then run the bridge agent from this repo:

```bash
node bridge.js agent "Add validation to the invoice parser and update README" --project /Users/Ryttis/some-project
```

Useful variants:

```bash
node bridge.js agent "Update README wording" --project /Users/Ryttis/some-project --dry-run
node bridge.js agent "Update README wording" --project /Users/Ryttis/some-project --no-memory
node bridge.js agent "Refactor parser validation" --project /Users/Ryttis/some-project --max-files 10 --verbose
```

The agent scans the target project, optionally queries memory through `mcp-server`, asks `core.llmComplete` for a JSON plan, reads only selected safe project files, asks `core.llmComplete` for full-file replacement edits, backs up originals into `.mcp_backups/YYYYMMDD-HHMMSS/`, applies edits, and optionally stores a summary through `core.memoryIngest`.

Use `--dry-run` before real edits. `OPENAI_API_KEY` is required by `mcp-server` for live LLM calls; the bridge does not print or manage that secret.

Normal tests are offline:

```bash
npm test
```

Live server smoke tests are guarded and require a running `mcp-server`:

```bash
RUN_LIVE_SMOKE=1 npm run smoke:server
```

The guarded live agent smoke test creates a temp project and exercises `node bridge.js agent` against a running server:

```bash
RUN_AGENT_SMOKE=1 npm run smoke:agent
```
