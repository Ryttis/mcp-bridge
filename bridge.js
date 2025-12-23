#!/usr/bin/env node
/**
 * 🤖 MCP Bridge — v3.0 (Universal Agent Integration)
 */

import dotenv from "dotenv";
import readline from "readline";
dotenv.config();

import { analyzeFile } from "./src/bridge/analyzer.js";
import { startInteractiveBridge } from "./src/bridge/interactive.js";
import { listTools } from "./src/bridge/utils.js";
import { improveFile } from "./src/bridge/agent.js";

const SERVER_URL = "ws://localhost:4000";
const TOKEN = process.env.AUTH_TOKEN;
const FULL_URL = `${SERVER_URL}?token=${TOKEN}`;

if (!TOKEN) {
    console.error("❌ Missing AUTH_TOKEN in .env");
    process.exit(1);
}

// Extract command + args properly
const [command, ...rest] = process.argv.slice(2);

(async () => {
    switch (command) {
        // 🧠 Analyze a file
        case "analyze": {
            const target = rest[0];
            if (!target) {
                console.error("❌ Missing file path.\nUsage: node bridge.js analyze <file>");
                process.exit(1);
            }
            await analyzeFile(SERVER_URL, TOKEN, target);
            break;
        }

        // 🔧 AI improve file
        case "improve": {
            const target = rest[0];
            const note = rest.slice(1).join(" ") || "Refactor for clarity and maintainability.";
            if (!target) {
                console.error("❌ Missing file path.\nUsage: node bridge.js improve <file> [instructions]");
                process.exit(1);
            }
            await improveFile(target, note);
            break;
        }

        // 🧪 NEW: Universal Agent recipe runner
        case "run-recipe": {
            const recipeName = rest[0];
            const target = rest[1];

            if (!recipeName) {
                console.error("❌ Missing recipe name.\nUsage: node bridge.js run-recipe <recipeName> [path]");
                process.exit(1);
            }

            const { runRecipe } = await import("./src/bridge/agent/index.js");

            try {
                await runRecipe(recipeName, target);
            } catch (err) {
                console.error("❌ Recipe failed:", err.message);
            }

            break;
        }

        // 💬 Default — interactive mode
        default: {
            console.log("🧩 MCP Interactive Bridge");
            console.log("Commands:");
            console.log("  analyze <file>          → Analyze file with ChatGPT");
            console.log("  improve <file> [text]   → Improve file with AI");
            console.log("  run-recipe <name> [path] → Run Universal Agent recipe");
            console.log();

            await listTools(FULL_URL);
            startInteractiveBridge(FULL_URL);
        }
    }

})();
