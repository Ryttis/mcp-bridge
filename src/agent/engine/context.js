/**
 * Universal Agent — Context Subsystem (v1)
 *
 * Responsible for creating and managing the RunContext object,
 * which holds all stable and mutable state for a single recipe run.
 *
 * Context contains:
 * - metadata (sessionId, timestamp, recipeName)
 * - user options
 * - file selection
 * - file content cache
 * - AI outputs
 * - validation info
 * - backup paths
 * - logs and errors
 */

import { v4 as uuidv4 } from "uuid";

/**
 * Create a new RunContext object.
 * @param {object} options - Partial RunOptions from CLI or recipe.
 * @returns {object} RunContext
 */
export function createContext(options = {}) {
    const timestamp = new Date().toISOString();

    const defaultOptions = {
        rootPath: process.cwd(),
        targetFiles: null,
        dryRun: false,
        verbose: false,
        mcpOnly: false,
        fsFallback: true
    };

    const mergedOptions = { ...defaultOptions, ...options };

    return {
        // identity
        sessionId: uuidv4(),
        timestamp,

        // recipe info
        recipeName: "",

        // immutable user options
        options: Object.freeze(mergedOptions),

        // pipeline internal tracking
        steps: [],

        // selection layer
        rootPath: mergedOptions.rootPath,
        targetFiles: mergedOptions.targetFiles,
        selectedFiles: [],

        // file content layer
        filesContent: {},      // file → original content
        aiOutputs: {},         // file → AI-generated content
        validatedOutputs: {},  // file → validated safe content

        // backup layer
        backupPaths: {},       // file → backup path
        backupFiles: [],
        updatedFiles: [],

        // validation layer
        validationResults: {}, // file → boolean valid/invalid

        // observability
        logs: [],
        errors: [],

        // per-step scratchpad
        state: {}
    };
}

/**
 * Update context safely. Immutable fields cannot be overridden.
 * @param {object} context
 * @param {object} mutations
 */
export function updateContext(context, mutations) {
    if (!mutations || typeof mutations !== "object") {
        throw new Error("Context update must be an object.");
    }

    const blocked = ["sessionId", "timestamp", "options", "recipeName"];

    for (const [key, value] of Object.entries(mutations)) {
        if (blocked.includes(key)) {
            throw new Error(`Cannot mutate immutable context key: ${key}`);
        }
        context[key] = value;
    }
}

/**
 * Add a normal log entry.
 * @param {object} context
 * @param {string} message
 */
export function addLog(context, message) {
    const ts = new Date().toISOString();
    context.logs.push(`[${ts}] ${message}`);
}

/**
 * Add an error entry.
 * Also logged into context.logs for visibility.
 * @param {object} context
 * @param {string|Error} err
 */
export function addError(context, err) {
    const ts = new Date().toISOString();
    const msg =
        typeof err === "string"
            ? err
            : err?.message || JSON.stringify(err);

    context.errors.push(`[${ts}] ERROR: ${msg}`);
    context.logs.push(`[${ts}] ERROR: ${msg}`);
}
