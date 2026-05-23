import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getServerUrl } from "../src/agent/kernel/serverUrl.js";

function redactSecrets(text) {
    let redacted = text || "";
    if (process.env.AUTH_TOKEN) {
        redacted = redacted.split(process.env.AUTH_TOKEN).join("[redacted]");
    }
    redacted = redacted.replace(/([?&]token=)[^&\s]+/g, "$1[redacted]");
    return redacted;
}

export function formatAgentSmokeFailure({ code, stdout = "", stderr = "", error } = {}) {
    const parts = [`agent smoke failed with exit ${code ?? "unknown"}`];
    if (error?.message) {
        parts.push(`error: ${error.message}`);
    }
    if (stderr.trim()) {
        parts.push(`stderr:\n${stderr.trim()}`);
    }
    if (stdout.trim()) {
        parts.push(`stdout:\n${stdout.trim()}`);
    }
    return redactSecrets(parts.join("\n"));
}

function runBridgeAgent(tempDir, scriptDir) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [
            "bridge.js",
            "agent",
            "Add one sentence to README explaining this is a smoke test",
            "--project",
            tempDir,
            "--no-memory"
        ], {
            cwd: path.resolve(scriptDir, ".."),
            env: {
                ...process.env,
                MCP_SERVER_URL: getServerUrl()
            },
            stdio: ["ignore", "pipe", "pipe"]
        });

        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (chunk) => {
            stdout += chunk.toString();
        });
        child.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
        });
        let spawnError = null;
        child.on("error", (err) => {
            spawnError = err;
        });
        child.on("close", (code) => {
            if (code === 0) {
                resolve({ stdout, stderr });
            } else {
                reject(new Error(formatAgentSmokeFailure({ code, stdout, stderr, error: spawnError })));
            }
        });
    });
}

async function main() {
    if (process.env.RUN_AGENT_SMOKE !== "1") {
        console.error("Set RUN_AGENT_SMOKE=1 to run the live agent smoke test.");
        process.exit(1);
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-bridge-agent-smoke-"));
    const readmePath = path.join(tempDir, "README.md");
    const scriptDir = path.dirname(fileURLToPath(import.meta.url));

    try {
        await fs.writeFile(readmePath, "# Smoke\n\nInitial README.\n", "utf8");

        await runBridgeAgent(tempDir, scriptDir);

        const updated = await fs.readFile(readmePath, "utf8");
        if (updated === "# Smoke\n\nInitial README.\n") {
            throw new Error("README.md was not changed");
        }

        console.log("[smoke-agent] passed");
        if (process.env.KEEP_SMOKE_DIR === "1") {
            console.log(`[smoke-agent] kept temp dir: ${tempDir}`);
        } else {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
    } catch (err) {
        console.error(`[smoke-agent] failed: ${err.message}`);
        if (process.env.KEEP_SMOKE_DIR === "1") {
            console.error(`[smoke-agent] kept temp dir: ${tempDir}`);
        } else {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
        process.exit(1);
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await main();
}
