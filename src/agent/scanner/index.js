import fs from "fs";
import path from "path";
import crypto from "crypto";
import { detectFileType } from "./fileType.js";

const IGNORE_DIRS = new Set([
    "node_modules", "vendor", ".git", ".ai", ".mcp_backups"
]);

const IGNORE_FILES = [
    ".DS_Store", "*.png", "*.jpg", "*.pdf", "*.zip", "*.bin", "*.exe", "*.dll"
];

const MAX_SIZE = 1024 * 1024; // 1MB

function matchIgnore(file, patterns) {
    return patterns.some((p) => {
        if (p.startsWith("*.")) return file.endsWith(p.slice(1));
        return file === p;
    });
}

/**
 * BFS directory walker
 */
export async function scanProject(rootPath) {
    const root = path.resolve(rootPath);
    const results = [];

    const queue = [root];

    while (queue.length > 0) {
        const current = queue.shift();
        const entries = fs.readdirSync(current, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(current, entry.name);

            // Skip ignored directories
            if (entry.isDirectory() && IGNORE_DIRS.has(entry.name)) continue;

            if (entry.isDirectory()) {
                queue.push(fullPath);
                continue;
            }

            // Skip ignored files
            if (matchIgnore(entry.name, IGNORE_FILES)) continue;

            const stats = fs.statSync(fullPath);
            if (stats.size > MAX_SIZE) {
                results.push({
                    path: fullPath,
                    relativePath: path.relative(root, fullPath),
                    size: stats.size,
                    extension: path.extname(fullPath),
                    type: "skipped",
                    isBinary: null,
                    lineCount: null,
                    hash: null,
                    skipped: "too_large"
                });
                continue;
            }

            const buffer = fs.readFileSync(fullPath);
            const typeInfo = detectFileType(fullPath, buffer);

            let lineCount = null;
            let hash = null;

            if (!typeInfo.isBinary) {
                const text = buffer.toString("utf8");
                lineCount = text.split("\n").length;
                hash = crypto.createHash("sha1").update(text).digest("hex");
            }

            results.push({
                path: fullPath,
                relativePath: path.relative(root, fullPath),
                size: stats.size,
                extension: typeInfo.extension,
                type: typeInfo.type,
                isBinary: typeInfo.isBinary,
                lineCount,
                hash,
                skipped: false
            });
        }
    }

    return results;
}
