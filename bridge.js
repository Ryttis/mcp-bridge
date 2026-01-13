#!/usr/bin/env node
/**
 * 🤖 MCP Bridge — v3.2
 * Kernel execution + Local Agent execution
 */

import dotenv from "dotenv";
dotenv.config();

import { startInteractiveBridge } from "./src/bridge/interactive.js";
import { listTools } from "./src/bridge/utils.js";
import { improveFile } from "./src/bridge/agent.js";
import { rpcCallOnce } from "./src/bridge/rpcClient.js";

// ✅ LOCAL AGENT IMPORT (NEW)
import { runRecipeLocal } from "./src/agent/runRecipeLocal.js";

const SERVER_URL = "ws://localhost:4000";
const TOKEN = process.env.AUTH_TOKEN;
const FULL_URL = `${SERVER_URL}?token=${TOKEN}`;

const [command, ...rest] = process.argv.slice(2);

// AUTH TOKEN is only required for kernel/server commands
const requiresKernel = ["analyze", "run-recipe"];

if (requiresKernel.includes(command) && !TOKEN) {
    console.error("❌ Missing AUTH_TOKEN in .env");
    process.exit(1);
}

(async () => {
    switch (command) {

        // ─────────────────────────────────────────────
        // 🧠 Analyze a file (KERNEL)
        // ─────────────────────────────────────────────
        case "analyze": {
            const target = rest[0];
            if (!target) {
                console.error("❌ Missing file path.\nUsage: node bridge.js analyze <file>");
                process.exit(1);
            }

            try {
                const result = await rpcCallOnce({
                    url: FULL_URL,
                    method: "core_analyzeFile",
                    params: { path: target },
                    timeoutMs: 25000
                });

                console.log("\n🔍 Analysis:\n");
                console.log(result);
                process.exit(0);
            } catch (err) {
                const code = err?.code || err?.kernelError?.code || "ERROR";
                console.error(`❌ Error [${code}]: ${err.message}`);
                process.exit(1);
            }

            return;
        }

        // ─────────────────────────────────────────────
        // 🧪 Run recipe (KERNEL / SERVER)
        // ─────────────────────────────────────────────
        case "run-recipe": {
            const recipe = rest[0];
            const target = rest[1] || ".";

            if (!recipe) {
                console.error("❌ Missing recipe name.\nUsage: node bridge.js run-recipe <recipe> [path]");
                process.exit(1);
            }

            try {
                const result = await rpcCallOnce({
                    url: FULL_URL,
                    method: "core_runRecipe",
                    params: { recipe, path: target },
                    timeoutMs: 40000
                });

                console.log("\n🧪 Recipe result (kernel):\n");
                console.log(result);
                process.exit(0);
            } catch (err) {
                const code = err?.code || err?.kernelError?.code || "ERROR";
                console.error(`❌ Error [${code}]: ${err.message}`);
                process.exit(1);
            }

            return;
        }

        // ─────────────────────────────────────────────
        // 🧠 Run recipe LOCALLY (AGENT + FILESYSTEM)
        // ─────────────────────────────────────────────
        case "run-recipe-local": {
            const recipe = rest[0];
            const target = rest[1] || ".";

            if (!recipe) {
                console.error("❌ Missing recipe name.\nUsage: node bridge.js run-recipe-local <recipe> [path]");
                process.exit(1);
            }

            try {
                const result = await runRecipeLocal({
                    recipeName: recipe,
                    targetPath: target
                });

                console.log("\n🧠 Local recipe result:\n");
                console.log(JSON.stringify(result ?? { ok: true }, null, 2));
                process.exit(0);
            } catch (err) {
                console.error(`❌ Local agent error: ${err.message}`);
                process.exit(1);
            }

            return;
        }

        // ─────────────────────────────────────────────
        // 🔧 AI improve file (LOCAL + KERNEL MIX)
        // ─────────────────────────────────────────────
        case "improve": {
            const target = rest[0];
            const note = rest.slice(1).join(" ") || "Refactor for clarity and maintainability.";

            if (!target) {
                console.error("❌ Missing file path.\nUsage: node bridge.js improve <file> [instructions]");
                process.exit(1);
            }

            try {
                await improveFile(target, note);
                process.exit(0);
            } catch (err) {
                const code = err?.code || err?.kernelError?.code || "ERROR";
                console.error(`❌ Error [${code}]: ${err.message}`);
                process.exit(1);
            }

            return;
        }

        // ─────────────────────────────────────────────
        // 💬 Default — interactive kernel mode
        // ─────────────────────────────────────────────
        default: {
            console.log("🧩 MCP Interactive Bridge");
            console.log("Commands:");
            console.log("  analyze <file>                 (kernel)");
            console.log("  improve <file> [text]          (local + kernel)");
            console.log("  run-recipe <name> [path]       (kernel)");
            console.log("  run-recipe-local <name> [path] (local agent)");
            console.log();

            if (TOKEN) {
                await listTools(FULL_URL);
                startInteractiveBridge(FULL_URL);
            } else {
                console.log("ℹ️ AUTH_TOKEN not set — kernel features disabled");
            }

            return;
        }
    }
})();
