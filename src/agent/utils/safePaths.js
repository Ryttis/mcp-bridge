import path from "node:path";

const BLOCKED_DIRS = new Set([
    ".git",
    "node_modules",
    "dist",
    "build"
]);

const BLOCKED_EXACT = new Set([
    "package-lock.json"
]);

const BINARY_EXTENSIONS = new Set([
    ".7z",
    ".bin",
    ".bmp",
    ".class",
    ".dll",
    ".dmg",
    ".exe",
    ".gif",
    ".ico",
    ".jpeg",
    ".jpg",
    ".lockb",
    ".mov",
    ".mp3",
    ".mp4",
    ".pdf",
    ".png",
    ".so",
    ".sqlite",
    ".webp",
    ".zip"
]);

function normalizeRelative(relativePath) {
    if (typeof relativePath !== "string" || !relativePath.trim()) {
        throw new Error("Path must be a non-empty relative path");
    }

    if (path.isAbsolute(relativePath)) {
        throw new Error(`Absolute paths are not allowed: ${relativePath}`);
    }

    const normalized = path.normalize(relativePath).replace(/\\/g, "/");
    if (normalized === "." || normalized.startsWith("../") || normalized === "..") {
        throw new Error(`Path escapes project root: ${relativePath}`);
    }

    return normalized;
}

export function resolveInsideProject(projectPath, relativePath) {
    const root = path.resolve(projectPath);
    const normalized = normalizeRelative(relativePath);
    const resolved = path.resolve(root, normalized);

    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
        throw new Error(`Path escapes project root: ${relativePath}`);
    }

    return resolved;
}

export function isSafeEditablePath(projectPath, relativePath) {
    try {
        const normalized = normalizeRelative(relativePath);
        resolveInsideProject(projectPath, normalized);

        const parts = normalized.split("/");
        if (parts.some((part) => BLOCKED_DIRS.has(part))) return false;
        if (normalized === "data/lance" || normalized.startsWith("data/lance/")) return false;
        if (BLOCKED_EXACT.has(normalized)) return false;
        if (BINARY_EXTENSIONS.has(path.extname(normalized).toLowerCase())) return false;

        return true;
    } catch {
        return false;
    }
}

export function assertSafeEditablePath(projectPath, relativePath) {
    if (!isSafeEditablePath(projectPath, relativePath)) {
        throw new Error(`Unsafe editable path rejected: ${relativePath}`);
    }

    return resolveInsideProject(projectPath, relativePath);
}
