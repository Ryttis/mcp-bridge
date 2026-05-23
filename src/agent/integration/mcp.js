import DefaultWebSocket from "ws";
import dotenv from "dotenv";
import { assertRpcAllowed } from "../kernel/rpcPolicy.js";

dotenv.config({ quiet: true });

let socket = null;
let socketUrl = null;
let connected = false;
let pending = new Map();
let requestId = 1;

function defaultServerUrl() {
    const base = process.env.MCP_SERVER_URL || `ws://localhost:${process.env.PORT || 4000}`;
    const token = process.env.AUTH_TOKEN;
    if (!token) return base;

    const url = new URL(base);
    url.searchParams.set("token", token);
    return url.toString();
}

function safeUrlForLog(wsUrl) {
    const url = new URL(wsUrl);
    if (url.searchParams.has("token")) {
        url.searchParams.set("token", "[redacted]");
    }
    return url.toString();
}

function rejectPending(err) {
    for (const [, entry] of pending) {
        clearTimeout(entry.timer);
        entry.reject(err);
    }
    pending.clear();
}

export function connectMCP(wsUrl = defaultServerUrl(), { WebSocketImpl = DefaultWebSocket } = {}) {
    if (connected && socket) return;

    socketUrl = wsUrl;
    socket = new WebSocketImpl(wsUrl);

    socket.on("open", () => {
        connected = true;
        console.log("[MCP] Connected to server:", safeUrlForLog(wsUrl));
    });

    socket.on("message", (msg) => {
        const raw = msg.toString();

        try {
            const data = JSON.parse(raw);

            if (data.id && pending.has(data.id)) {
                const entry = pending.get(data.id);
                pending.delete(data.id);
                clearTimeout(entry.timer);

                if (data.error) {
                    console.error("[MCP] Server error:", data.error);
                    return entry.reject(
                        new Error(data.error.message || "MCP server error", {
                            cause: data.error
                        })
                    );
                }

                if (data.result && data.result.ok === false && data.result.error) {
                    return entry.resolve({
                        ok: false,
                        error: data.result.error,
                        stack: data.result.stack || null
                    });
                }

                return entry.resolve(data.result);
            }

        } catch (err) {
            console.error("[MCP] Invalid JSON from server:", raw);
        }
    });

    socket.on("close", () => {
        connected = false;
        socket = null;
        socketUrl = null;
        rejectPending(new Error("MCP connection closed before response"));
        console.log("[MCP] Disconnected.");
    });

    socket.on("error", (err) => {
        console.error("[MCP] Error:", err);
        rejectPending(err);
    });
}

export async function callMCP(method, params = {}, { timeoutMs = 30000 } = {}) {
    assertRpcAllowed(method, { ...process.env, MCP_SERVER_URL: socketUrl || defaultServerUrl() });

    if (!socket) connectMCP();

    // Wait until WebSocket is open
    const connectStarted = Date.now();
    while (!connected) {
        if (Date.now() - connectStarted > timeoutMs) {
            throw new Error(`MCP connection timed out after ${timeoutMs} ms`);
        }
        await new Promise((r) => setTimeout(r, 20));
    }

    return new Promise((resolve, reject) => {
        const id = requestId++;

        const timer = setTimeout(() => {
            pending.delete(id);
            reject(new Error(`MCP call '${method}' timed out after ${timeoutMs} ms`));
        }, timeoutMs);

        pending.set(id, { resolve, reject, timer });

        socket.send(
            JSON.stringify({
                jsonrpc: "2.0",
                id,
                method,
                params,
            })
        );
    });
}

export async function callMCPReadFile(filePath, options = {}) {
    return callMCP("core.readFile", { path: filePath }, options);
}

export function disconnectMCP() {
    try {
        socket?.close();
    } catch {}

    connected = false;
    socket = null;
    socketUrl = null;
    rejectPending(new Error("MCP disconnected"));
}
