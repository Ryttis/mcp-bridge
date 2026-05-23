import test from "node:test";
import assert from "node:assert/strict";

import { memoryIngest, memoryQuery } from "../src/agent/kernel/memoryClient.js";

test("memoryQuery calls core.memoryQuery through injected RPC caller", async () => {
    const result = await memoryQuery({
        query: "find this",
        topK: 3,
        serverUrl: "ws://localhost:4444",
        token: "test-token",
        rpcCaller: async (request) => {
            assert.equal(request.url, "ws://localhost:4444/?token=test-token");
            assert.equal(request.method, "core.memoryQuery");
            assert.deepEqual(request.params, { query: "find this", topK: 3 });
            assert.equal(request.timeoutMs, 60000);
            return { results: [{ id: "m1", text: "memory" }] };
        }
    });

    assert.deepEqual(result, { results: [{ id: "m1", text: "memory" }] });
});

test("memoryIngest calls core.memoryIngest through injected RPC caller", async () => {
    const result = await memoryIngest({
        text: "remember this",
        id: "memory-1",
        metadata: { source: "test" },
        serverUrl: "ws://localhost:4444",
        token: "test-token",
        rpcCaller: async (request) => {
            assert.equal(request.url, "ws://localhost:4444/?token=test-token");
            assert.equal(request.method, "core.memoryIngest");
            assert.deepEqual(request.params, {
                text: "remember this",
                metadata: { source: "test" },
                id: "memory-1"
            });
            assert.equal(request.timeoutMs, 60000);
            return { ok: true, id: "memory-1" };
        }
    });

    assert.deepEqual(result, { ok: true, id: "memory-1" });
});
