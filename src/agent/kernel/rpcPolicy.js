import { getTargetMode } from "./targetMode.js";

const FILESYSTEM_RPC_METHODS = new Set([
    "core.readFile",
    "core.writeFile",
    "core.listDir",
    "core.runCommand",
    "core.analyzeFile",
    "core.readProjectFile"
]);

const warnedMethods = new Set();

export function isFilesystemRpcMethod(method) {
    if (FILESYSTEM_RPC_METHODS.has(method)) return true;
    return method?.startsWith("etno.") || method?.startsWith("factura.");
}

export function assertRpcAllowed(method, env = process.env, { warn = console.warn } = {}) {
    if (!isFilesystemRpcMethod(method)) return;

    const mode = getTargetMode(env);
    const allowRemoteFsRpc = env.MCP_ALLOW_REMOTE_FS_RPC === "true";
    const guardedMode = mode === "hybrid-agent" || mode === "remote-runtime" || mode === "remote-scan";

    if (!guardedMode || allowRemoteFsRpc) {
        if (guardedMode && allowRemoteFsRpc && warn && !warnedMethods.has(method)) {
            warnedMethods.add(method);
            warn(
                `[MCP] MCP_ALLOW_REMOTE_FS_RPC=true: '${method}' may operate on the remote server filesystem.`
            );
        }
        return;
    }

    if (mode === "remote-runtime") {
        throw new Error(
            `Blocked filesystem RPC '${method}' in remote-runtime. Set MCP_ALLOW_REMOTE_FS_RPC=true only if you intend to use the remote server filesystem.`
        );
    }

    if (mode === "remote-scan") {
        throw new Error(
            `Blocked filesystem RPC '${method}' in remote-scan. Phase 1 has no explicit remote-root scan command.`
        );
    }

    throw new Error(
        `Blocked filesystem RPC '${method}' in hybrid-agent. Project files stay local in mcp-bridge; set MCP_ALLOW_REMOTE_FS_RPC=true only if you intend to use the remote Ubuntu filesystem.`
    );
}

export default {
    assertRpcAllowed,
    isFilesystemRpcMethod
};
