import test from "node:test";
import assert from "node:assert/strict";

import { isSafeEditablePath, resolveInsideProject } from "../src/agent/utils/safePaths.js";

const projectPath = "/tmp/mcp-bridge-safe-paths";

test("resolveInsideProject rejects parent traversal", () => {
    assert.throws(() => resolveInsideProject(projectPath, "../escape.js"), /escapes project root/);
});

test("isSafeEditablePath rejects node_modules", () => {
    assert.equal(isSafeEditablePath(projectPath, "node_modules/pkg/index.js"), false);
});

test("isSafeEditablePath accepts common source paths", () => {
    assert.equal(isSafeEditablePath(projectPath, "src/index.js"), true);
    assert.equal(isSafeEditablePath(projectPath, "README.md"), true);
});
