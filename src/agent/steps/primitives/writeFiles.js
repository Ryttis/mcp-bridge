/**
 * Step: writeFiles
 *
 * Input (format 1):
 * {
 *   updates: {
 *      "/abs/path/file1.js": "new content",
 *      "/abs/path/file2.js": "other content"
 *   }
 * }
 *
 * Input (format 2):
 * {
 *   target: "headers",           // directory relative to rootPath
 *   filename: "scan-project_{date}.json",  // filename with optional {date} placeholder
 *   source: "state.scan"         // path in context.state (dot notation)
 * }
 */

import fs from "fs/promises";
import path from "path";

export default {
    id: "writeFiles",

    async run(context, stepDef = {}, params = {}) {
        // Check if using alternative format (target/filename/source)
        // These can be in stepDef directly or in params
        const target = stepDef.target || params.target;
        const filename = stepDef.filename || params.filename;
        const source = stepDef.source || params.source;

        if (target && filename && source) {
            // Resolve target directory relative to rootPath
            const targetDir = path.resolve(context.rootPath, target);

            // Replace {date} placeholder with current date
            const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const resolvedFilename = filename.replace('{date}', dateStr);

            // Resolve full file path
            const filePath = path.resolve(targetDir, resolvedFilename);

            // Get source data from context.state using dot notation
            const sourceParts = source.split('.');
            let sourceData = context.state;
            for (const part of sourceParts.slice(1)) { // Skip 'state'
                if (sourceData && typeof sourceData === 'object' && part in sourceData) {
                    sourceData = sourceData[part];
                } else {
                    throw new Error(`writeFiles: source '${source}' not found in context.state`);
                }
            }

            // Convert source data to JSON string
            const content = JSON.stringify(sourceData, null, 2);

            // Create updates object in expected format
            const updates = { [filePath]: content };

            // Continue with normal write logic
            context.updatedFiles = context.updatedFiles || {};

            for (const [filePath, content] of Object.entries(updates)) {
                try {
                    await fs.mkdir(path.dirname(filePath), { recursive: true });
                    await fs.writeFile(filePath, content, "utf8");

                    context.updatedFiles[filePath] = true;
                } catch (err) {
                    console.error(`writeFiles: failed writing ${filePath}`, err);
                    context.updatedFiles[filePath] = false;
                }
            }

            return {
                ok: true,
                written: Object.keys(updates).length
            };
        }

        // Original format (updates object)
        const { updates = {} } = params;

        if (typeof updates !== "object") {
            throw new Error("writeFiles: 'updates' must be an object, or provide 'target', 'filename', and 'source'");
        }

        context.updatedFiles = context.updatedFiles || {};

        for (const [filePath, content] of Object.entries(updates)) {
            try {
                await fs.mkdir(path.dirname(filePath), { recursive: true });
                await fs.writeFile(filePath, content, "utf8");

                context.updatedFiles[filePath] = true;
            } catch (err) {
                console.error(`writeFiles: failed writing ${filePath}`, err);
                context.updatedFiles[filePath] = false;
            }
        }

        return {
            ok: true,
            written: Object.keys(updates).length
        };
    }
};
