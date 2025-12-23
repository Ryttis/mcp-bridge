/**
 * Universal Agent — IO Layer (v1)
 *
 * Hybrid readFile:
 * 1. Try MCP core_readFile
 * 2. Fallback to local filesystem if enabled
 */

import fs from "fs";
import path from "path";
import { logStep, logError } from "../logging/logger.js";
import { callMCPReadFile } from "./mcp.js";

/**
 * Read a file using MCP first, then FS fallback.
 * @param {object} context
 * @param {string} filePath
 */
export async function readFileViaIO(context, filePath) {
    const absPath = path.resolve(context.options.rootPath, filePath);

    // Try MCP
    if (!context.options.mcpOnly) {
        try {
            const result = await callMCPReadFile(absPath);
            if (result) {
                return result;
            }
        } catch (_) {
            // Ignore — fallback is allowed
        }
    }

    // FS fallback
    if (context.options.fsFallback) {
        return await fs.promises.readFile(absPath, "utf8");
    }

    throw new Error(`IO: Could not read file (MCP or FS): ${filePath}`);
}
