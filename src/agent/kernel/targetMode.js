const VALID_TARGET_MODES = new Set([
    "local-dev",
    "hybrid-agent",
    "remote-runtime",
    "remote-scan"
]);

const LOCAL_HOSTS = new Set([
    "localhost",
    "127.0.0.1",
    "::1",
    "[::1]"
]);

export function getServerUrl(env = process.env) {
    return env.MCP_SERVER_URL || `ws://localhost:${env.PORT || 4000}`;
}

export function isRemoteServer(url = getServerUrl()) {
    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        return true;
    }

    return !LOCAL_HOSTS.has(parsed.hostname);
}

export function getTargetMode(env = process.env) {
    const explicitMode = env.MCP_TARGET_MODE;

    if (explicitMode) {
        if (!VALID_TARGET_MODES.has(explicitMode)) {
            throw new Error(
                `Invalid MCP_TARGET_MODE '${explicitMode}'. Expected one of: ${[...VALID_TARGET_MODES].join(", ")}`
            );
        }
        return explicitMode;
    }

    const serverUrl = getServerUrl(env);
    return isRemoteServer(serverUrl) ? "hybrid-agent" : "local-dev";
}

function serverBackedHost(serverUrl) {
    return isRemoteServer(serverUrl) ? "remote-server" : "local-server";
}

function warningsFor({ mode, serverRemote }) {
    const warnings = [];

    if (mode === "hybrid-agent") {
        warnings.push(
            "Project files are read/written locally by bridge. Raw filesystem RPC tools target the remote Ubuntu filesystem."
        );
    }

    if (mode === "remote-runtime") {
        warnings.push("Use this for runtime/voice/smoke tests, not local project edits.");
    }

    if (mode === "remote-scan") {
        warnings.push("Remote scan is explicit/future-only and requires a remote root.");
    }

    if (mode === "local-dev" && serverRemote) {
        warnings.push("MCP_TARGET_MODE=local-dev is set but MCP_SERVER_URL points to a remote host.");
    }

    return warnings;
}

export function describeExecutionPlan(env = process.env) {
    const mode = getTargetMode(env);
    const serverUrl = getServerUrl(env);
    const serverRemote = isRemoteServer(serverUrl);
    const serverHost = serverRemote ? "remote" : "local";
    const serverBacked = serverBackedHost(serverUrl);

    const plan = {
        targetMode: mode,
        MCP_TARGET_MODE: mode,
        MCP_SERVER_URL: serverUrl,
        serverHost,
        cwd: process.cwd(),
        filesystemHost: "local-bridge",
        llmHost: serverBacked,
        memoryHost: serverBacked,
        voiceHost: serverBacked,
        warnings: warningsFor({ mode, serverRemote })
    };

    if (mode === "remote-scan") {
        plan.filesystemHost = "remote-server";
    }

    return plan;
}

export default {
    getTargetMode,
    getServerUrl,
    isRemoteServer,
    describeExecutionPlan
};
