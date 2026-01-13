import fs from "fs";
import path from "path";

export function loadGitignore(rootPath) {
    const gitignorePath = path.join(rootPath, ".gitignore");

    if (!fs.existsSync(gitignorePath)) return [];

    const content = fs.readFileSync(gitignorePath, "utf8");

    return content
        .split("\n")
        .map(l => l.trim())
        .filter(l => l && !l.startsWith("#"));
}
