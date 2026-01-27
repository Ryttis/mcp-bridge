import fs from "fs/promises";
import path from "path";

export async function getLastScan(ctx, params = {}) {
    const { file = "headers/scan-project_latest.json" } = params;
    const p = path.resolve(file);
    const content = await fs.readFile(p, "utf8");
    return { path: p, content: JSON.parse(content) };
}
