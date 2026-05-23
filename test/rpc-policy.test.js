import test from "node:test";
import assert from "node:assert/strict";

import { assertRpcAllowed, isFilesystemRpcMethod } from "../src/agent/kernel/rpcPolicy.js";
import { rpcCallOnce } from "../src/bridge/rpcClient.js";

test("isFilesystemRpcMethod identifies raw filesystem RPC tools", () => {
    assert.equal(isFilesystemRpcMethod("core.readFile"), true);
    assert.equal(isFilesystemRpcMethod("core.runCommand"), true);
    assert.equal(isFilesystemRpcMethod("etno.readFile"), true);
    assert.equal(isFilesystemRpcMethod("factura.readFile"), true);
    assert.equal(isFilesystemRpcMethod("core.llmComplete"), false);
    assert.equal(isFilesystemRpcMethod("voice.getCallStatus"), false);
});

test("hybrid-agent blocks raw filesystem RPC without explicit override", () => {
    assert.throws(
        () => assertRpcAllowed("core.readFile", {
            MCP_TARGET_MODE: "hybrid-agent",
            MCP_SERVER_URL: "ws://90.134.5.179:4000"
        }, { warn: null }),
        /Blocked filesystem RPC 'core\.readFile' in hybrid-agent/
    );
});

test("remote-runtime blocks raw filesystem RPC without explicit override", () => {
    assert.throws(
        () => assertRpcAllowed("core.runCommand", {
            MCP_TARGET_MODE: "remote-runtime",
            MCP_SERVER_URL: "ws://90.134.5.179:4000"
        }, { warn: null }),
        /Blocked filesystem RPC 'core\.runCommand' in remote-runtime/
    );
});

test("explicit override allows raw filesystem RPC with warning", () => {
    const warnings = [];

    assert.doesNotThrow(() => assertRpcAllowed("core.listDir", {
        MCP_TARGET_MODE: "hybrid-agent",
        MCP_SERVER_URL: "ws://90.134.5.179:4000",
        MCP_ALLOW_REMOTE_FS_RPC: "true"
    }, { warn: (message) => warnings.push(message) }));

    assert.match(warnings.join("\n"), /MCP_ALLOW_REMOTE_FS_RPC=true/);
});

test("runtime and backend RPC tools are allowed remotely", () => {
    const env = {
        MCP_TARGET_MODE: "remote-runtime",
        MCP_SERVER_URL: "ws://90.134.5.179:4000"
    };

    assert.doesNotThrow(() => assertRpcAllowed("core.llmComplete", env));
    assert.doesNotThrow(() => assertRpcAllowed("core.memoryQuery", env));
    assert.doesNotThrow(() => assertRpcAllowed("core.memoryIngest", env));
    assert.doesNotThrow(() => assertRpcAllowed("core.ping", env));
    assert.doesNotThrow(() => assertRpcAllowed("core.projectStatus", env));
    assert.doesNotThrow(() => assertRpcAllowed("voice.getCallStatus", env));
});

test("rpcCallOnce infers hybrid guard from direct remote URL", async () => {
    const previousMode = process.env.MCP_TARGET_MODE;
    const previousServerUrl = process.env.MCP_SERVER_URL;
    const previousAllow = process.env.MCP_ALLOW_REMOTE_FS_RPC;

    try {
        delete process.env.MCP_TARGET_MODE;
        delete process.env.MCP_SERVER_URL;
        delete process.env.MCP_ALLOW_REMOTE_FS_RPC;

        await assert.rejects(
            rpcCallOnce({
                url: "ws://90.134.5.179:4000",
                method: "core.readFile",
                params: { path: "/Users/Ryttis/project/README.md" },
                timeoutMs: 10
            }),
            /Blocked filesystem RPC 'core\.readFile' in hybrid-agent/
        );
    } finally {
        if (previousMode === undefined) delete process.env.MCP_TARGET_MODE;
        else process.env.MCP_TARGET_MODE = previousMode;

        if (previousServerUrl === undefined) delete process.env.MCP_SERVER_URL;
        else process.env.MCP_SERVER_URL = previousServerUrl;

        if (previousAllow === undefined) delete process.env.MCP_ALLOW_REMOTE_FS_RPC;
        else process.env.MCP_ALLOW_REMOTE_FS_RPC = previousAllow;
    }
});
