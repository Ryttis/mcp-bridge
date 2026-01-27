import fs from "fs/promises";
import path from "path";

export async function analyzeFile(ctx, params = {}) {
    const { filePath } = params;
    const abs = path.resolve(filePath);
    const content = await fs.readFile(abs, "utf8");

    return {
        path: abs,
        size: content.length,
        lines: content.split("\n").length
    };
}
