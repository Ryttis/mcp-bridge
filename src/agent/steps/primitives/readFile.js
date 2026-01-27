import { run as readFilesRun } from "./readFiles.js";

export async function readFile(ctx, params = {}) {
    const { filePath } = params;

    const context = {
        selectedFiles: [filePath],
        logs: [],
        options: { verbose: false }
    };

    const result = await readFilesRun(context);
    const content = result.mutations.filesContent[filePath];

    return { path: filePath, content };
}
