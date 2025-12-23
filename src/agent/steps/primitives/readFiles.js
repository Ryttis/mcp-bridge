/**
 * Step: readFiles
 *
 * Reads file contents for all selectedFiles in context.
 *
 * Input expected in context:
 *   context.selectedFiles = ["/abs/path/file1.js", "/abs/path/file2.js"]
 *
 * Output:
 *   context.filesContent = {
 *      "/abs/path/file1.js": "content...",
 *      "/abs/path/file2.js": "content..."
 *   }
 */

import fs from "fs/promises";
import { logStep, logError } from "../../logging/logger.js";

export async function run(context) {
    const files = context.selectedFiles || [];

    if (!Array.isArray(files) || files.length === 0) {
        throw new Error("readFiles: context.selectedFiles must be a non-empty array");
    }

    logStep(context, "readFiles", `Reading ${files.length} files…`);

    const contents = context.filesContent || {};

    for (const filePath of files) {
        try {
            const content = await fs.readFile(filePath, "utf8");
            contents[filePath] = content;
        } catch (err) {
            logError(context, `readFiles failed for ${filePath}: ${err.message}`);
            contents[filePath] = null;
        }
    }

    return {
        mutations: {
            filesContent: contents
        }
    };
}
