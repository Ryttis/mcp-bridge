/**
 * Primitive Step: backupFiles
 *
 * Creates backup copies of selected files defined in context.backupPaths
 * using the shared backup manager.
 */

import { backupAllSelectedFiles } from "../../backup/manager.js";
import { logStep } from "../../logging/logger.js";

export async function run(context) {
    logStep(context, "backupFiles", "Backing up selected files…");

    const result = await backupAllSelectedFiles(context);

    return {
        mutations: {
            backupPaths: result.backupPaths || context.backupPaths,
            backupFiles: result.backupFiles || context.backupFiles
        }
    };
}

export default {
    id: "backupFiles",
    run
};
