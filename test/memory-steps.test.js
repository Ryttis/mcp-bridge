import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";

import { connectMCP, disconnectMCP } from "../src/agent/integration/mcp.js";
import { run as runMemoryQuery } from "../src/agent/steps/memory/memoryQuery.js";
import { run as runMemoryIngest } from "../src/agent/steps/memory/memoryIngest.js";

function nextTick() {
    return new Promise((resolve) => setImmediate(resolve));
}

function createRespondingWebSocket(assertMethod, result) {
    return class RespondingWebSocket extends EventEmitter {
        constructor() {
            super();
            queueMicrotask(() => this.emit("open"));
        }

        send(msg) {
            const request = JSON.parse(msg);
            assert.equal(request.method, assertMethod);
            queueMicrotask(() => {
                this.emit("message", JSON.stringify({
                    jsonrpc: "2.0",
                    id: request.id,
                    result
                }));
            });
        }

        close() {
            this.emit("close");
        }
    };
}

test("memory step modules import successfully", () => {
    assert.equal(typeof runMemoryQuery, "function");
    assert.equal(typeof runMemoryIngest, "function");
});

test("memoryQuery stores server results in context mutations", async () => {
    const WebSocketImpl = createRespondingWebSocket(
        "core.memoryQuery",
        { results: [{ id: "m1", text: "matched" }] }
    );

    connectMCP("ws://test.local", { WebSocketImpl });
    await nextTick();
    const result = await runMemoryQuery({ state: {} }, { query: "bridge", topK: 1 });
    assert.deepEqual(result.mutations.memoryResults, [{ id: "m1", text: "matched" }]);

    disconnectMCP();
});

test("memoryIngest stores server result in context mutations", async () => {
    const WebSocketImpl = createRespondingWebSocket(
        "core.memoryIngest",
        { ok: true, id: "ingested-1" }
    );

    connectMCP("ws://test.local", { WebSocketImpl });
    await nextTick();
    const result = await runMemoryIngest({ state: {} }, { text: "remember this", id: "x" });
    assert.deepEqual(result.mutations.memoryIngestResult, { ok: true, id: "ingested-1" });

    disconnectMCP();
});
