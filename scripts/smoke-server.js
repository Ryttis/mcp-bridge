import { rpcCallOnce } from "../src/bridge/rpcClient.js";

function serverUrl() {
    const base = process.env.MCP_SERVER_URL || `ws://localhost:${process.env.PORT || 4000}`;
    const token = process.env.AUTH_TOKEN;
    if (!token) return base;

    const url = new URL(base);
    url.searchParams.set("token", token);
    return url.toString();
}

async function call(method, params, timeoutMs = 130000) {
    const result = await rpcCallOnce({
        url: serverUrl(),
        method,
        params,
        timeoutMs
    });

    console.log(`[smoke] ${method}: ok`);
    return result;
}

if (process.env.RUN_LIVE_SMOKE !== "1") {
    console.error("Set RUN_LIVE_SMOKE=1 to run live mcp-server smoke tests.");
    process.exit(1);
}

try {
    await call("core.memoryIngest", {
        id: `mcp-bridge-smoke-${Date.now()}`,
        text: "mcp-bridge live smoke memory ingest",
        metadata: { source: "mcp-bridge-smoke" }
    }, 30000);

    await call("core.memoryQuery", {
        query: "mcp-bridge live smoke",
        topK: 3
    }, 30000);

    await call("core.llmComplete", {
        prompt: "Reply with the single word ok.",
        response_format: "text"
    });

    console.log("[smoke] server smoke passed");
} catch (err) {
    const code = err?.code || err?.kernelError?.code || "ERROR";
    console.error(`[smoke] failed [${code}]: ${err.message}`);
    process.exit(1);
}
