#!/usr/bin/env node
/**
 * 🤖 MCP Bridge — v3.2
 * Kernel execution + Local Agent execution
 */

import dotenv from "dotenv";
dotenv.config({ quiet: true });

import { startInteractiveBridge } from "./src/bridge/interactive.js";
import { listTools } from "./src/bridge/utils.js";
import { improveFile } from "./src/bridge/agent.js";
import { rpcCallOnce } from "./src/bridge/rpcClient.js";
import { buildDoctorReport, formatDoctorReport } from "./src/agent/kernel/doctor.js";
import { describeExecutionPlan, getTargetMode } from "./src/agent/kernel/targetMode.js";

// ✅ LOCAL AGENT IMPORT (NEW)
import { runRecipeLocal } from "./src/agent/runRecipeLocal.js";
import { runAgentEdit } from "./src/agent/workflows/agentEdit.js";
import { runSupplierCallAgent } from "./src/agent/workflows/supplierCallAgent.js";
import {
    formatVoiceTestCallSummary,
    parseVoiceCallIdArgs,
    parseVoiceTestCallArgs,
    runVoiceResult,
    runVoiceStatus,
    runVoiceTranscribe,
    runVoiceTestCall
} from "./src/agent/workflows/voiceTestCall.js";

const SERVER_URL = process.env.MCP_SERVER_URL || `ws://localhost:${process.env.PORT || 4000}`;
const TOKEN = process.env.AUTH_TOKEN;
function withAuthToken(url, token) {
    if (!token) return url;
    const parsed = new URL(url);
    parsed.searchParams.set("token", token);
    return parsed.toString();
}

const FULL_URL = withAuthToken(SERVER_URL, TOKEN);

const [command, ...rest] = process.argv.slice(2);

function isHybridAgentMode() {
    return getTargetMode() === "hybrid-agent";
}

function warnHybridAgentExecution() {
    if (!isHybridAgentMode()) return;
    console.warn("Hybrid agent: filesystem=local bridge, LLM/memory=remote mcp-server.");
}

function assertLocalProjectWorkflowAllowed(commandName) {
    const mode = getTargetMode();
    if (mode !== "remote-runtime") return;

    throw new Error(
        `${commandName} is not allowed in MCP_TARGET_MODE=remote-runtime. ` +
        "Use MCP_TARGET_MODE=hybrid-agent for local project files with remote LLM/memory, or local-dev for local server development."
    );
}

function parseAgentArgs(args) {
    const request = args[0];
    const options = {
        projectPath: process.cwd(),
        dryRun: false,
        useMemory: true,
        maxFiles: 20,
        verbose: false
    };

    for (let i = 1; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case "--project":
                options.projectPath = args[++i];
                break;
            case "--dry-run":
                options.dryRun = true;
                break;
            case "--no-memory":
                options.useMemory = false;
                break;
            case "--max-files": {
                const value = Number.parseInt(args[++i], 10);
                if (!Number.isInteger(value) || value < 1) {
                    throw new Error("--max-files must be a positive integer");
                }
                options.maxFiles = value;
                break;
            }
            case "--verbose":
                options.verbose = true;
                break;
            default:
                throw new Error(`Unknown agent option: ${arg}`);
        }
    }

    if (!request) {
        throw new Error("Missing request.\nUsage: node bridge.js agent \"<request>\" --project <path> [--dry-run] [--no-memory] [--max-files <n>] [--verbose]");
    }

    if (!options.projectPath) {
        throw new Error("--project requires a path");
    }

    return { request, ...options };
}

function parseSupplierCallArgs(args) {
    const options = {
        inputPath: null,
        dryRun: false,
        json: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case "--input":
                options.inputPath = args[++i];
                break;
            case "--dry-run":
                options.dryRun = true;
                break;
            case "--json":
                options.json = true;
                break;
            default:
                throw new Error(`Unknown supplier-call option: ${arg}`);
        }
    }

    if (!options.inputPath) {
        throw new Error("Missing --input.\nUsage: node bridge.js supplier-call --input <campaign.json> --dry-run [--json]");
    }

    if (!options.dryRun) {
        throw new Error("supplier-call currently supports --dry-run only");
    }

    return options;
}

// AUTH TOKEN is only required for kernel/server commands
const requiresKernel = ["analyze", "run-recipe"];

if (requiresKernel.includes(command) && !TOKEN) {
    console.error("❌ Missing AUTH_TOKEN in .env");
    process.exit(1);
}

(async () => {
    switch (command) {

        // ─────────────────────────────────────────────
        // 🩺 Runtime / routing diagnostic
        // ─────────────────────────────────────────────
        case "doctor": {
            const json = rest.includes("--json");
            const report = buildDoctorReport();

            if (json) {
                process.stdout.write(`${JSON.stringify(report)}\n`);
            } else {
                console.log(formatDoctorReport(report));
            }

            process.exit(0);
            return;
        }

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
                    method: "core.analyzeFile",
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

            if (!recipe) {
                console.error("❌ Missing recipe name.\nUsage: node bridge.js run-recipe <recipe> [path]");
                process.exit(1);
            }

            console.error(
                "❌ Server-side run-recipe is unsupported in Phase 1. " +
                "Use `node bridge.js run-recipe-local <recipe> [path]` for local bridge recipes."
            );
            process.exit(1);

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
                assertLocalProjectWorkflowAllowed("run-recipe-local");
                warnHybridAgentExecution();
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
        // 🛠️ Local coding agent (FILESYSTEM + SERVER LLM)
        // ─────────────────────────────────────────────
        case "agent": {
            try {
                assertLocalProjectWorkflowAllowed("agent");
                warnHybridAgentExecution();
                const options = parseAgentArgs(rest);
                const result = await runAgentEdit(options);

                console.log("\n🛠️ Agent result:\n");
                console.log(JSON.stringify(result, null, 2));
                process.exit(0);
            } catch (err) {
                console.error(`❌ Agent error: ${err.message}`);
                process.exit(1);
            }

            return;
        }

        // ─────────────────────────────────────────────
        // ☎️ Supplier call dry-run (LOCAL)
        // ─────────────────────────────────────────────
        case "supplier-call": {
            let jsonOutput = false;

            try {
                const options = parseSupplierCallArgs(rest);
                jsonOutput = options.json;
                const result = await runSupplierCallAgent({
                    inputPath: options.inputPath,
                    dryRun: options.dryRun
                });

                if (options.json) {
                    process.stdout.write(`${JSON.stringify(result)}\n`);
                } else {
                    console.log("Supplier call dry-run plan:");
                    console.log(`- Campaign: ${result.campaignId}`);
                    console.log(`- Sellers: ${result.sellerCount}`);
                    console.log(`- Parts: ${result.partCount}`);
                    console.log();
                    console.log("☎️ Supplier call dry-run result:");
                    console.log();
                    console.log(JSON.stringify(result, null, 2));
                }

                process.exit(0);
            } catch (err) {
                if (jsonOutput) {
                    console.error(JSON.stringify({ ok: false, error: err.message }));
                } else {
                    console.error(`❌ Supplier call error: ${err.message}`);
                }
                process.exit(1);
            }

            return;
        }

        // ─────────────────────────────────────────────
        // ☎️ Voice test call (SERVER-GATED)
        // ─────────────────────────────────────────────
        case "voice-test-call": {
            let jsonOutput = rest.includes("--json");

            try {
                const options = parseVoiceTestCallArgs(rest);
                jsonOutput = options.json;
                const result = await runVoiceTestCall({
                    phone: options.phone,
                    dryRun: options.dryRun,
                    call: options.call,
                    responseMode: options.responseMode
                });

                if (options.json) {
                    process.stdout.write(`${JSON.stringify(result)}\n`);
                } else {
                    console.log(formatVoiceTestCallSummary(result));
                }

                process.exit(0);
            } catch (err) {
                if (jsonOutput) {
                    console.error(JSON.stringify({ ok: false, error: err.message }));
                } else {
                    console.error(`❌ Voice test call error: ${err.message}`);
                }
                process.exit(1);
            }

            return;
        }

        // ─────────────────────────────────────────────
        // ☎️ Voice manual transcription status (SERVER-GATED)
        // ─────────────────────────────────────────────
        case "voice-transcribe": {
            let jsonOutput = rest.includes("--json");

            try {
                const options = parseVoiceCallIdArgs(rest, "voice-transcribe");
                jsonOutput = options.json;
                const result = await runVoiceTranscribe({ callId: options.callId });

                if (options.json) {
                    process.stdout.write(`${JSON.stringify(result)}\n`);
                } else {
                    console.log("Voice transcription:");
                    console.log(JSON.stringify(result, null, 2));
                }

                process.exit(0);
            } catch (err) {
                if (jsonOutput) {
                    console.error(JSON.stringify({ ok: false, error: err.message }));
                } else {
                    console.error(`❌ Voice transcription error: ${err.message}`);
                }
                process.exit(1);
            }

            return;
        }

        // ─────────────────────────────────────────────
        // ☎️ Voice call status (SERVER MOCK)
        // ─────────────────────────────────────────────
        case "voice-status": {
            let jsonOutput = rest.includes("--json");

            try {
                const options = parseVoiceCallIdArgs(rest, "voice-status");
                jsonOutput = options.json;
                const result = await runVoiceStatus({ callId: options.callId });

                if (options.json) {
                    process.stdout.write(`${JSON.stringify(result)}\n`);
                } else {
                    console.log("Voice call status:");
                    console.log(JSON.stringify(result, null, 2));
                }

                process.exit(0);
            } catch (err) {
                if (jsonOutput) {
                    console.error(JSON.stringify({ ok: false, error: err.message }));
                } else {
                    console.error(`❌ Voice status error: ${err.message}`);
                }
                process.exit(1);
            }

            return;
        }

        // ─────────────────────────────────────────────
        // ☎️ Voice call result (SERVER MOCK)
        // ─────────────────────────────────────────────
        case "voice-result": {
            let jsonOutput = rest.includes("--json");

            try {
                const options = parseVoiceCallIdArgs(rest, "voice-result");
                jsonOutput = options.json;
                const result = await runVoiceResult({ callId: options.callId });

                if (options.json) {
                    process.stdout.write(`${JSON.stringify(result)}\n`);
                } else {
                    console.log("Voice call result:");
                    console.log(JSON.stringify(result, null, 2));
                }

                process.exit(0);
            } catch (err) {
                if (jsonOutput) {
                    console.error(JSON.stringify({ ok: false, error: err.message }));
                } else {
                    console.error(`❌ Voice result error: ${err.message}`);
                }
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
            console.log("  doctor [--json]                 (routing diagnostics)");
            console.log("  analyze <file>                 (kernel)");
            console.log("  improve <file> [text]          (local + kernel)");
            console.log("  agent \"<request>\" --project <path> [--dry-run] [--no-memory] [--max-files <n>] [--verbose]");
            console.log("  supplier-call --input <file> --dry-run [--json] (local dry-run)");
            console.log("  voice-test-call --phone <phone> (--dry-run|--call) [--response-mode gather|record] [--json]");
            console.log("  voice-status --call-id <callId> [--json]");
            console.log("  voice-result --call-id <callId> [--json]");
            console.log("  voice-transcribe --call-id <callId> [--json]");
            console.log("  run-recipe <name> [path]       (kernel)");
            console.log("  run-recipe-local <name> [path] (local agent)");
            console.log();
            const plan = describeExecutionPlan();
            console.log(`Mode: ${plan.MCP_TARGET_MODE} | filesystem=${plan.filesystemHost} | llm=${plan.llmHost} | memory=${plan.memoryHost} | voice=${plan.voiceHost}`);
            for (const warning of plan.warnings) {
                console.warn(`⚠️ ${warning}`);
            }
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
