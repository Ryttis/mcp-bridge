import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";

import { callMCP, connectMCP, disconnectMCP } from "../src/agent/integration/mcp.js";

function nextTick() {
    return new Promise((resolve) => setImmediate(resolve));
}

class SilentWebSocket extends EventEmitter {
    constructor() {
        super();
        queueMicrotask(() => this.emit("open"));
    }

    send() {}

    close() {
        this.emit("close");
    }
}

test("callMCP rejects when a connected server does not respond", async () => {
    connectMCP("ws://test.local", { WebSocketImpl: SilentWebSocket });
    await nextTick();

    await assert.rejects(
        callMCP("core.neverResponds", {}, { timeoutMs: 75 }),
        /timed out/
    );

    disconnectMCP();
});

test("callMCP resolves JSON-RPC results", async () => {
    class RespondingWebSocket extends EventEmitter {
        constructor() {
            super();
            queueMicrotask(() => this.emit("open"));
        }

        send(msg) {
            const request = JSON.parse(msg);
            queueMicrotask(() => {
                this.emit("message", JSON.stringify({
                    jsonrpc: "2.0",
                    id: request.id,
                    result: { results: [{ id: "m1", text: "memory" }] }
                }));
            });
        }

        close() {
            this.emit("close");
        }
    }

    connectMCP("ws://test.local", { WebSocketImpl: RespondingWebSocket });
    await nextTick();
    const result = await callMCP("core.memoryQuery", { query: "x" }, { timeoutMs: 500 });

    assert.deepEqual(result, { results: [{ id: "m1", text: "memory" }] });

    disconnectMCP();
});
