# Hybrid Agent Usage

## Responsibility Split

`mcp-server` is stable deployed infrastructure/runtime. It owns:

- RPC server transport
- global state
- tool registry and tool execution
- snapshots
- workspace resolution
- security and auth
- backend/runtime services such as LLM, memory, protocol tools, and voice/Twilio

`mcp-bridge` is the local-first AI/orchestration layer. It owns:

- CLI commands
- recipe loading and validation
- step orchestration
- agent context model
- AI agents and planners
- snapshot consumption
- project-specific logic
- local project file scan/read/write/backup operations

Do not move recipes or AI orchestration into `mcp-server`. Do not use a deployed
server to scan Mac project files. In hybrid mode, project files stay local in the
bridge process.

## Modes

| Mode | Server URL | Filesystem | LLM | Memory | Voice/runtime | Use for |
| --- | --- | --- | --- | --- | --- | --- |
| `local-dev` | local server | local bridge | local server | local server | local server | Developing both repos locally |
| `hybrid-agent` | deployed or remote server | local bridge | remote server | remote server | remote server | Local agents using deployed backend services |
| `remote-runtime` | deployed or remote server | local bridge, no project edits | remote server | remote server | remote server | Voice/status/transcribe/smoke tests |
| `remote-scan` | deployed or remote server | remote server | remote server | remote server | remote server | Future explicit scans of Ubuntu project copies |

`remote-scan` is future-only in Phase 1 and must not be inferred from a remote
`MCP_SERVER_URL`.

## Doctor

Check how the bridge will route work:

```bash
node bridge.js doctor
node bridge.js doctor --json
```

In `hybrid-agent`, doctor should report:

- `filesystemHost=local-bridge`
- `llmHost=remote-server`
- `memoryHost=remote-server`
- `voiceHost=remote-server`

Raw filesystem RPC tools such as `core.readFile`, `core.writeFile`,
`core.listDir`, `core.runCommand`, `core.analyzeFile`, `etno.*`, and `factura.*`
target the server filesystem. In hybrid/runtime modes they are blocked unless
`MCP_ALLOW_REMOTE_FS_RPC=true` is set intentionally.

## Local Dev

```bash
MCP_TARGET_MODE=local-dev \
MCP_SERVER_URL=ws://localhost:4000 \
node bridge.js agent "Update README wording" --project /Users/Ryttis/project --dry-run
```

## Hybrid Agent

Local project files are scanned/read/written by `mcp-bridge`. LLM and memory
calls go to the deployed server.

```bash
MCP_TARGET_MODE=hybrid-agent \
MCP_SERVER_URL=ws://90.134.5.179:4000 \
AUTH_TOKEN="$AUTH_TOKEN" \
node bridge.js agent "Refactor parser validation" --project /Users/Ryttis/project --dry-run
```

## Hybrid Local Scan

This scans the Mac filesystem from the bridge process, even though the backend
server URL is remote.

```bash
MCP_TARGET_MODE=hybrid-agent \
MCP_SERVER_URL=ws://90.134.5.179:4000 \
node bridge.js run-recipe-local scan-project /Users/Ryttis/mcp-server
```

## Remote Runtime Voice

Use `remote-runtime` for deployed runtime commands.

```bash
MCP_TARGET_MODE=remote-runtime \
MCP_SERVER_URL=ws://90.134.5.179:4000 \
AUTH_TOKEN="$AUTH_TOKEN" \
node bridge.js voice-status --call-id "..." --json
```

Real voice calls still require the server-side safety gates: approved call mode,
configured provider, allowed test number, and enabled server environment. Supplier
batch calls remain disconnected.

## SSH Tunnel

Prefer an SSH tunnel when testing a deployed server from the local bridge:

```bash
ssh -p 2212 -L 4000:localhost:4000 rytis@90.134.5.179
MCP_TARGET_MODE=hybrid-agent MCP_SERVER_URL=ws://localhost:4000 node bridge.js doctor
```

With the tunnel, the server URL looks local to the bridge, so keep
`MCP_TARGET_MODE=hybrid-agent` explicit when you intend to use deployed backend
services.
