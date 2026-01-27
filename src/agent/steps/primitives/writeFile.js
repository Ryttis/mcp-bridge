import writeFilesStep from "./writeFiles.js";

export async function writeFile(ctx, params = {}) {
    const { filePath, content } = params;

    const context = {
        updatedFiles: {},
        logs: [],
        options: { verbose: false }
    };

    const result = await writeFilesStep.run(context, {}, {
        updates: {
            [filePath]: content
        }
    });

    return { path: filePath, ok: true };
}
