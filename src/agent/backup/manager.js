/**
 * Backup Manager (v1)
 *
 * Responsibilities:
 * - Create a backup root directory with timestamp
 * - Write original file content into mirrored directory structure
 * - Expose backup paths for other steps
 */

import fs from "fs";
import path from "path";
import { logStep, logError } from "../logging/logger.js";

/**
 * Ensure backup root exists and store its path in context.
 * @param {object} context
 */
export async function initializeBackupRoot(context) {
    const timestamp = context.timestamp.replace(/[:.]/g, "-");

    const backupRoot = path.join(
        context.options.rootPath,
        ".mcp_backups",
        timestamp
    );

    await fs.promises.mkdir(backupRoot, { recursive: true });

    return {
        mutations: {
            backupRoot: backupRoot
        }
    };
}

/**
 * Write backup for a single file using the mirrored folder structure.
 * @param {object} context
 * @param {string} file
 * @param {string} originalContent
 * @returns {Promise<string>} absolute backup file path
 */
export async function writeBackupFile(context, file, originalContent) {
    const root = context.backupRoot;

    if (!root) {
        throw new Error(
            "Backup root not initialized. Call initializeBackupRoot() first."
        );
    }

    const absBackupPath = path.join(root, file);
    const dir = path.dirname(absBackupPath);

    try {
        await fs.promises.mkdir(dir, { recursive: true });
        await fs.promises.writeFile(absBackupPath, originalContent, "utf8");

        return absBackupPath;
    } catch (err) {
        logError(
            context,
            `Failed to write backup for '${file}': ${err?.message || err}`
        );
        return null;
    }
}

/**
 * Create backups for all selected files before AI or write phases.
 * @param {object} context
 */
export async function backupAllSelectedFiles(context) {
    const files = context.selectedFiles || [];
    const originals = context.filesContent || {};

    logStep(
        context,
        "backup",
        `Creating backups for ${files.length} file(s) in mirrored structure`
    );

    const map = {};

    for (const file of files) {
        const content = originals[file];
        if (!content) continue;

        const backupPath = await writeBackupFile(context, file, content);
        if (backupPath) {
            map[file] = backupPath;
        }
    }

    return {
        mutations: {
            backupPaths: map
        }
    };
}
