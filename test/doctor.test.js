import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

import { buildDoctorReport, formatDoctorReport } from "../src/agent/kernel/doctor.js";

test("buildDoctorReport includes JSON-safe doctor fields", () => {
    const report = buildDoctorReport({
        MCP_TARGET_MODE: "hybrid-agent",
        MCP_SERVER_URL: "ws://90.134.5.179:4000"
    });

    assert.equal(report.MCP_TARGET_MODE, "hybrid-agent");
    assert.equal(report.MCP_SERVER_URL, "ws://90.134.5.179:4000");
    assert.equal(report.serverHost, "remote");
    assert.equal(report.filesystemHost, "local-bridge");
    assert.equal(report.llmHost, "remote-server");
    assert.equal(report.memoryHost, "remote-server");
    assert.equal(report.voiceHost, "remote-server");
    assert.ok(Array.isArray(report.warnings));
});

test("formatDoctorReport prints routing summary", () => {
    const output = formatDoctorReport(buildDoctorReport({
        MCP_TARGET_MODE: "remote-runtime",
        MCP_SERVER_URL: "ws://90.134.5.179:4000"
    }));

    assert.match(output, /MCP bridge doctor/);
    assert.match(output, /MCP_TARGET_MODE: remote-runtime/);
    assert.match(output, /filesystemHost: local-bridge/);
    assert.match(output, /Use this for runtime\/voice\/smoke tests/);
});

test("bridge doctor --json outputs parseable JSON", () => {
    const result = spawnSync(process.execPath, ["bridge.js", "doctor", "--json"], {
        cwd: process.cwd(),
        env: {
            ...process.env,
            MCP_TARGET_MODE: "hybrid-agent",
            MCP_SERVER_URL: "ws://90.134.5.179:4000"
        },
        encoding: "utf8"
    });

    assert.equal(result.status, 0, result.stderr);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.MCP_TARGET_MODE, "hybrid-agent");
    assert.equal(parsed.serverHost, "remote");
    assert.equal(parsed.filesystemHost, "local-bridge");
});
