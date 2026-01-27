// src/bridge/agentAdapterOld.js
/**
 * Adapter-only placeholder.
 * Agent and AI logic have been moved to MCP Server kernel.
 *
 * Bridge rule: do not implement business logic.
 * If kernel tool is missing, fail with a mapped, kernel-derived error shape.
 */

import { BridgeUnknownMethodError } from "./rpcClient.js";

export async function improveFile() {
    throw new BridgeUnknownMethodError(
        "improve is not available: MCP server does not expose an improve tool in this milestone.",
        {
            kernelError: {
                code: "UNKNOWN_METHOD",
                message: "core_improveFile (or equivalent) is not registered in kernel"
            }
        }
    );
}

export async function runRecipe() {
    throw new BridgeUnknownMethodError(
        "run-recipe is not implemented in bridge. Use the kernel tool instead.",
        {
            kernelError: {
                code: "UNKNOWN_METHOD",
                message: "Local run-recipe is disabled in bridge; use core_runRecipe"
            }
        }
    );
}