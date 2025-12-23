/**
 * Step: writeFiles
 *
 * Input:
 * {
 *   updates: {
 *      "/abs/path/file1.js": "new content",
 *      "/abs/path/file2.js": "other content"
 *   }
 * }
 */

import fs from "fs/promises";
import path from "path";

export default {
    id: "writeFiles",

    async run(context, params = {}) {
        const { updates = {} } = params;

        if (typeof updates !== "object") {
            throw new Error("writeFiles: 'updates' must be an object");
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
