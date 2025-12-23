import fg from "fast-glob";
import { logStep } from "../../logging/logger.js";

export async function run(context, stepCfg) {
    const patterns = stepCfg.patterns;
    const ignore = stepCfg.ignore || [];
    const root =
        stepCfg.root ||
        context.options?.targetFiles?.[0] ||
        context.options?.rootPath;

    if (!patterns || !Array.isArray(patterns) || patterns.length === 0) {
        throw new Error("selectFiles: 'patterns' must be a non-empty array");
    }

    logStep(context, "selectFiles", `Using root: ${root}`);

    let files;
    try {
        files = fg.sync(patterns, {
            cwd: root,
            ignore: ignore,
            onlyFiles: true,
            absolute: true,
        });
    } catch (err) {
        throw new Error(`selectFiles fast-glob failed: ${err.message}`);
    }

    logStep(context, "selectFiles", `Matched ${files.length} files`);

    return {
        mutations: {
            selectedFiles: files,
            rootPath: root
        }
    };
}
