/**
 * Primitive Step: backupInit
 *
 * Initializes backup tracking inside the recipe context.
 * This step does NOT write files — it only prepares a backup registry.
 */

export async function run(context) {
    // Create backup storage if missing
    context.backupPaths = context.backupPaths || {};
    context.backupFiles = context.backupFiles || [];

    return {
        mutations: {
            backupPaths: context.backupPaths,
            backupFiles: context.backupFiles
        }
    };
}

export default {
    id: "backupInit",
    run
};
