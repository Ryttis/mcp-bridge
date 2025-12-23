import { readdir, stat } from "fs/promises";
import path from "path";

export async function listDir(basePath = process.cwd()) {
    const entries = await readdir(basePath, { withFileTypes: true });

    return Promise.all(
        entries.map(async (entry) => {
            const fullPath = path.join(basePath, entry.name);
            const s = await stat(fullPath);
            return {
                name: entry.name,
                fullPath,
                isDir: entry.isDirectory(),
                size: entry.isDirectory() ? null : s.size,
                mtime: s.mtime.toISOString(),
                ext: entry.isDirectory()
                    ? null
                    : path.extname(entry.name).replace(/^\./, "").toLowerCase(),
            };
        })
    );
}
