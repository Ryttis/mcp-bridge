import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { runAgentEdit } from "../src/agent/workflows/agentEdit.js";

async function makeTempProject() {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-bridge-agent-test-"));
    await fs.writeFile(path.join(dir, "README.md"), "# Test\n\nOld text.\n", "utf8");
    return dir;
}

function createMockLlm(newContent = "# Test\n\nNew text.\n") {
    const calls = [];
    const llmCompleteFn = async (request) => {
        calls.push(request);
        if (calls.length === 1) {
            return JSON.stringify({
                summary: "Read README",
                filesToRead: ["README.md"],
                risks: [],
                steps: ["Update README"]
            });
        }

        return JSON.stringify({
            summary: "Updated README",
            edits: [
                {
                    path: "README.md",
                    action: "replace",
                    content: newContent
                }
            ],
            notes: [],
            testsSuggested: ["Review README.md"]
        });
    };

    return { calls, llmCompleteFn };
}

test("runAgentEdit dry-run produces planned edits without writing", async () => {
    const projectPath = await makeTempProject();
    const { llmCompleteFn } = createMockLlm("# Test\n\nDry run text.\n");

    const result = await runAgentEdit({
        request: "Update README",
        projectPath,
        dryRun: true,
        useMemory: false,
        llmCompleteFn
    });

    const after = await fs.readFile(path.join(projectPath, "README.md"), "utf8");
    assert.equal(after, "# Test\n\nOld text.\n");
    assert.equal(result.dryRun, true);
    assert.deepEqual(result.changedFiles, ["README.md"]);
    assert.equal(result.backupDir, null);
});

test("runAgentEdit writes a file when dryRun is false", async () => {
    const projectPath = await makeTempProject();
    const { llmCompleteFn } = createMockLlm("# Test\n\nChanged by agent.\n");

    const result = await runAgentEdit({
        request: "Update README",
        projectPath,
        useMemory: false,
        llmCompleteFn
    });

    const after = await fs.readFile(path.join(projectPath, "README.md"), "utf8");
    assert.equal(after, "# Test\n\nChanged by agent.\n");
    assert.deepEqual(result.changedFiles, ["README.md"]);
    assert.ok(result.backupDir);
});

test("runAgentEdit creates backup before writing", async () => {
    const projectPath = await makeTempProject();
    const { llmCompleteFn } = createMockLlm("# Test\n\nChanged with backup.\n");

    const result = await runAgentEdit({
        request: "Update README",
        projectPath,
        useMemory: false,
        llmCompleteFn,
        date: new Date("2026-04-29T12:34:56Z")
    });

    const backup = await fs.readFile(path.join(result.backupDir, "README.md"), "utf8");
    assert.equal(backup, "# Test\n\nOld text.\n");
});

test("runAgentEdit continues if memory query fails", async () => {
    const projectPath = await makeTempProject();
    const { llmCompleteFn } = createMockLlm("# Test\n\nChanged despite memory failure.\n");

    const result = await runAgentEdit({
        request: "Update README",
        projectPath,
        llmCompleteFn,
        memoryQueryFn: async () => {
            throw new Error("server unavailable");
        },
        memoryIngestFn: async () => ({ ok: true })
    });

    assert.equal(result.ok, true);
    assert.match(result.warnings.join("\n"), /Memory query failed/);
});

test("runAgentEdit calls memory ingest after successful write", async () => {
    const projectPath = await makeTempProject();
    const { llmCompleteFn } = createMockLlm("# Test\n\nChanged and remembered.\n");
    let ingestPayload = null;

    const result = await runAgentEdit({
        request: "Update README",
        projectPath,
        llmCompleteFn,
        memoryQueryFn: async () => ({ results: [{ text: "previous context" }] }),
        memoryIngestFn: async (payload) => {
            ingestPayload = payload;
            return { ok: true };
        }
    });

    assert.equal(result.memoryIngested, true);
    assert.equal(ingestPayload.metadata.kind, "agent-edit-summary");
    assert.match(ingestPayload.text, /Changed files: README\.md/);
});

test("runAgentEdit labels planning LLM failures", async () => {
    const projectPath = await makeTempProject();

    await assert.rejects(
        runAgentEdit({
            request: "Update README",
            projectPath,
            useMemory: false,
            llmCompleteFn: async () => {
                throw new Error("AI completion failed");
            }
        }),
        /AI planning failed: AI completion failed/
    );
});

test("runAgentEdit labels edit generation LLM failures", async () => {
    const projectPath = await makeTempProject();
    let calls = 0;

    await assert.rejects(
        runAgentEdit({
            request: "Update README",
            projectPath,
            useMemory: false,
            llmCompleteFn: async () => {
                calls += 1;
                if (calls === 1) {
                    return JSON.stringify({
                        summary: "Read README",
                        filesToRead: ["README.md"],
                        risks: [],
                        steps: ["Update README"]
                    });
                }
                throw new Error("OPENAI_KEY_MISSING");
            }
        }),
        /AI edit generation failed: OPENAI_KEY_MISSING/
    );
});

test("runAgentEdit keeps filesystem operations in injected local adapters", async () => {
    const projectPath = "/local/project";
    const { llmCompleteFn } = createMockLlm("# Test\n\nChanged locally.\n");
    const calls = [];
    const files = new Map([
        [path.join(projectPath, "README.md"), "# Test\n\nOld text.\n"]
    ]);

    const result = await runAgentEdit({
        request: "Update README",
        projectPath,
        useMemory: false,
        llmCompleteFn,
        scanProjectFn: async (root) => {
            calls.push(["scan", root]);
            return [{
                path: path.join(root, "README.md"),
                relativePath: "README.md",
                size: files.get(path.join(root, "README.md")).length,
                extension: ".md",
                type: "text",
                isBinary: false,
                lineCount: 3,
                hash: "x",
                skipped: false
            }];
        },
        readFileFn: async (filePath) => {
            calls.push(["read", filePath]);
            return files.get(filePath);
        },
        writeFileFn: async (filePath, content) => {
            calls.push(["write", filePath]);
            files.set(filePath, content);
        },
        statFn: async (filePath) => ({ size: files.get(filePath).length }),
        mkdirFn: async (dirPath) => {
            calls.push(["mkdir", dirPath]);
        },
        copyFileFn: async (from, to) => {
            calls.push(["copy", from, to]);
        },
        accessFn: async () => {}
    });

    assert.equal(result.ok, true);
    assert.deepEqual(result.changedFiles, ["README.md"]);
    assert.deepEqual(calls.filter(([kind]) => kind === "scan"), [["scan", projectPath]]);
    assert.deepEqual(calls.filter(([kind]) => kind === "read"), [["read", path.join(projectPath, "README.md")]]);
    assert.deepEqual(calls.filter(([kind]) => kind === "write"), [["write", path.join(projectPath, "README.md")]]);
});
