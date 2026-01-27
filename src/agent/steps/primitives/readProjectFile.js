import fs from "fs/promises";
import path from "path";

export async function readProjectFile(ctx, params = {}) {
    const { filePath, rootPath = process.cwd(), encoding = "utf-8" } = params;
    const abs = path.resolve(rootPath, filePath);
    const content = await fs.readFile(abs, encoding);
    return { path: abs, content };
}
