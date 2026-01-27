import fs from "fs/promises";
import path from "path";

export async function snapshotServer(ctx, params = {}) {
    const { targetDir = "snapshots", name = "snapshot.json", state = {} } = params;
    const dir = path.resolve(targetDir);
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, name);
    await fs.writeFile(filePath, JSON.stringify(state, null, 2), "utf8");
    return { path: filePath, ok: true };
}
