import fs from "fs/promises";
import path from "path";

export async function projectStatus(ctx, params = {}) {
    const root = params.rootPath || process.cwd();
    const pkgPath = path.join(root, "package.json");

    let pkg = null;
    try {
        const raw = await fs.readFile(pkgPath, "utf8");
        pkg = JSON.parse(raw);
    } catch {}

    return {
        root,
        name: pkg?.name || null,
        version: pkg?.version || null
    };
}
