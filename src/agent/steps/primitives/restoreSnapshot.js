import fs from "fs/promises";
import path from "path";

export async function restoreSnapshot(ctx, params = {}) {
    const { file } = params;
    const p = path.resolve(file);
    const content = await fs.readFile(p, "utf8");
    const data = JSON.parse(content);
    return { data };
}
