import path from "path";

/**
 * Detect if a file buffer is binary.
 * Very small heuristic: look for zero-bytes and non-UTF8 sequences.
 */
export function isBinary(buffer) {
    const len = Math.min(buffer.length, 8000); // sample
    for (let i = 0; i < len; i++) {
        if (buffer[i] === 0) return true;        // null byte → binary
        if (buffer[i] > 127) return false;       // non-ASCII → likely text
    }
    return false;
}

/**
 * Return file type info based on buffer + extension.
 */
export function detectFileType(filePath, buffer) {
    const ext = path.extname(filePath).replace(".", "").toLowerCase();

    const binary = isBinary(buffer);

    return {
        isBinary: binary,
        extension: ext || null,
        type: binary ? "binary" : "text",
    };
}
