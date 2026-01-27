import fs from "fs/promises";
import path from "path";

export async function setLastContext(ctx, params = {}) {
    const { file = "headers/last-context.json", data = {} } = params;
    const p = path.resolve(file);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, JSON.stringify(data, null, 2), "utf8");
    return { path: p, ok: true };
}
