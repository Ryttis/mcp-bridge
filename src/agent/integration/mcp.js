import WebSocket from "ws";
import dotenv from "dotenv";

dotenv.config();

let socket = null;
let connected = false;
let pending = new Map();
let requestId = 1;

export function connectMCP(
    wsUrl = "ws://localhost:4000?token=" + process.env.AUTH_TOKEN
) {
    if (connected && socket) return;

    socket = new WebSocket(wsUrl);

    socket.on("open", () => {
        connected = true;
        console.log("[MCP] Connected to server:", wsUrl);
    });

    socket.on("message", (msg) => {
        const raw = msg.toString();

        try {
            const data = JSON.parse(raw);

            if (data.id && pending.has(data.id)) {
                const resolve = pending.get(data.id);
                pending.delete(data.id);

                if (data.error) {
                    console.error("[MCP] Server error:", data.error);
                    return resolve({
                        ok: false,
                        error: data.error.message,
                        stack: data.error.stack || null
                    });
                }

                return resolve(data.result);
            }

        } catch (err) {
            console.error("[MCP] Invalid JSON from server:", raw);
        }
    });

    socket.on("close", () => {
        connected = false;
        socket = null;
        pending.clear();
        console.log("[MCP] Disconnected.");
    });

    socket.on("error", (err) => {
        console.error("[MCP] Error:", err);
    });
}

export async function callMCP(method, params = {}) {
    if (!connected) connectMCP();

    // Wait until WebSocket is open
    while (!connected) {
        await new Promise((r) => setTimeout(r, 20));
    }

    return new Promise((resolve) => {
        const id = requestId++;

        pending.set(id, resolve);

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
