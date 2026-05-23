import test from "node:test";
import assert from "node:assert/strict";

import {
    describeExecutionPlan,
    getServerUrl,
    getTargetMode,
    isRemoteServer
} from "../src/agent/kernel/targetMode.js";

test("getTargetMode defaults to local-dev without MCP_SERVER_URL", () => {
    assert.equal(getTargetMode({}), "local-dev");
});

test("getTargetMode defaults to local-dev for localhost", () => {
    assert.equal(getTargetMode({ MCP_SERVER_URL: "ws://localhost:4000" }), "local-dev");
    assert.equal(getTargetMode({ MCP_SERVER_URL: "ws://127.0.0.1:4000" }), "local-dev");
});

test("getTargetMode defaults to hybrid-agent for remote MCP_SERVER_URL", () => {
    assert.equal(getTargetMode({ MCP_SERVER_URL: "ws://90.134.5.179:4000" }), "hybrid-agent");
});

test("getTargetMode honors explicit modes and never infers remote-scan", () => {
    assert.equal(
        getTargetMode({
            MCP_TARGET_MODE: "remote-scan",
            MCP_SERVER_URL: "ws://90.134.5.179:4000"
        }),
        "remote-scan"
    );
    assert.notEqual(getTargetMode({ MCP_SERVER_URL: "ws://90.134.5.179:4000" }), "remote-scan");
});

test("getTargetMode rejects invalid modes", () => {
    assert.throws(
        () => getTargetMode({ MCP_TARGET_MODE: "remote-ish" }),
        /Invalid MCP_TARGET_MODE/
    );
});

test("isRemoteServer detects local and remote server URLs", () => {
    assert.equal(isRemoteServer("ws://localhost:4000"), false);
    assert.equal(isRemoteServer("ws://127.0.0.1:4000"), false);
    assert.equal(isRemoteServer("ws://90.134.5.179:4000"), true);
});

test("describeExecutionPlan reports hybrid-agent routing", () => {
    const plan = describeExecutionPlan({
        MCP_TARGET_MODE: "hybrid-agent",
        MCP_SERVER_URL: "ws://90.134.5.179:4000"
    });

    assert.equal(plan.MCP_TARGET_MODE, "hybrid-agent");
    assert.equal(plan.serverHost, "remote");
    assert.equal(plan.filesystemHost, "local-bridge");
    assert.equal(plan.llmHost, "remote-server");
    assert.equal(plan.memoryHost, "remote-server");
    assert.equal(plan.voiceHost, "remote-server");
    assert.match(plan.warnings.join("\n"), /Raw filesystem RPC tools target the remote Ubuntu filesystem/);
});

test("getServerUrl uses PORT fallback", () => {
    assert.equal(getServerUrl({ PORT: "4555" }), "ws://localhost:4555");
});
