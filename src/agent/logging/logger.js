/**
 * Universal Agent — Logging Layer (v1)
 *
 * Provides:
 * - structured info/error/step logging
 * - console output (based on verbosity)
 * - persistent log writing into .ai/logs/{timestamp}.log
 */

import fs from "fs";
import path from "path";
import { formatInfo, formatError, formatStep } from "./formatter.js";

/**
 * Append an info-level log entry to context and optionally to console.
 * @param {object} context
 * @param {string} message
 */
export function logInfo(context, message) {
    const entry = formatInfo(message);
    context.logs.push(entry);

    if (context.options.verbose) {
        console.log(entry);
    }
}

/**
 * Append an error-level log entry to context (and console).
 * @param {object} context
 * @param {string} message
 */
export function logError(context, message) {
    const entry = formatError(message);

    context.errors.push(entry);
    context.logs.push(entry);

    // Always print errors
    console.error(entry);
}

/**
 * Log a step-level entry (for pipeline step begin/end/details).
 * @param {object} context
 * @param {string} stepId
 * @param {string} message
 */
export function logStep(context, stepId, message) {
    const entry = formatStep(stepId, message);
    context.logs.push(entry);

    if (context.options.verbose) {
        console.log(entry);
    }
}

/**
 * Write all accumulated logs to a persistent file.
 * @param {object} context
 * @returns {Promise<string>} path to the written log file
 */
export async function finalizeLogs(context) {
    const logsDir = path.join(process.cwd(), ".ai", "logs");
    const filePath = path.join(logsDir, `${context.timestamp}.log`);

    await fs.promises.mkdir(logsDir, { recursive: true });

    const output = context.logs.join("\n") + "\n";

    await fs.promises.writeFile(filePath, output, "utf8");

    return filePath;
}
