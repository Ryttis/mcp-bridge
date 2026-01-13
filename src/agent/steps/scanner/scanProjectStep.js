import fs from "fs";
import path from "path";
import { scanProject } from "../../scanner/index.js";

/**
 * Load and normalize .gitignore rules
 */
function loadGitignore(rootPath) {
    const gitignorePath = path.join(rootPath, ".gitignore");

    if (!fs.existsSync(gitignorePath)) return [];

    const content = fs.readFileSync(gitignorePath, "utf8");

    return content
        .split("\n")
        .map(line => line.trim())
        .filter(line => line && !line.startsWith("#"))
        .map(rule => {
            if (rule.endsWith("/")) return `${rule}**`;
            return rule;
        });
}

/**
 * Check if a file path matches a gitignore pattern
 * Handles gitignore-style patterns:
 * - Directory patterns: "dir/" matches all files under "dir/"
 * - Recursive patterns: "**" matches pattern at any depth
 * - Wildcard patterns: "*" matches files with extension
 * - Exact matches: "file" matches exactly
 */
function matchesPattern(filePath, relativePath, pattern) {
    // Normalize paths for comparison (use relative path)
    const testPath = relativePath || filePath;
    const normalizedPath = testPath.replace(/\\/g, "/");

    // Handle directory patterns ending with / or /**
    if (pattern.endsWith("/") || pattern.endsWith("/**")) {
        const dirPattern = pattern.replace(/\/\*\*$/, "").replace(/\/$/, "");
        // Match if path starts with directory pattern
        if (normalizedPath === dirPattern || normalizedPath.startsWith(dirPattern + "/")) {
            return true;
        }
    }

    // Handle patterns with ** (recursive)
    if (pattern.includes("**")) {
        // Convert ** to regex .*, but don't escape . in .*
        let regexPattern = pattern
            .replace(/\*\*/g, "__RECURSIVE__")
            .replace(/\*/g, "[^/]*")
            .replace(/\./g, "\\.")
            .replace(/__RECURSIVE__/g, ".*"); // Replace after escaping dots

        try {
            const regex = new RegExp("^" + regexPattern + "$");
            if (regex.test(normalizedPath) || regex.test(path.basename(normalizedPath))) {
                return true;
            }
        } catch (e) {
            // Invalid regex, fall through to other checks
        }
    }

    // Handle wildcard patterns like *.ext
    if (pattern.includes("*") && !pattern.includes("**")) {
        // Check if pattern matches filename
        const basename = path.basename(normalizedPath);
        const regexPattern = "^" + pattern.replace(/\*/g, ".*").replace(/\./g, "\\.") + "$";
        try {
            const regex = new RegExp(regexPattern);
            if (regex.test(basename)) {
                return true;
            }
        } catch (e) {
            // Invalid regex, fall through
        }
    }

    // Exact match or path contains pattern
    if (normalizedPath === pattern) {
        return true;
    }

    // Check if path starts with pattern (for directory/file matching)
    if (normalizedPath.startsWith(pattern + "/") || normalizedPath.startsWith(pattern)) {
        return true;
    }

    // Check if pattern is in the path (last resort)
    if (normalizedPath.includes(pattern)) {
        // But only if it's at a component boundary
        const parts = normalizedPath.split("/");
        const patternParts = pattern.split("/");
        for (let i = 0; i <= parts.length - patternParts.length; i++) {
            if (parts.slice(i, i + patternParts.length).join("/") === pattern) {
                return true;
            }
        }
    }

    return false;
}

export default {
    "scan-project": {
        async run(context, params = {}) {
            const rootPath = path.resolve(context.rootPath || ".");
            const scanRoot = path.resolve(rootPath, params.root || ".");

            // Load gitignore rules
            const gitignoreRules = loadGitignore(rootPath);

            // Merge recipe excludes + gitignore
            const excludePatterns = [
                ...(params.exclude || []),
                ...gitignoreRules
            ];

            // Store ignore patterns in context
            context.ignore = {
                patterns: excludePatterns,
                source: "gitignore"
            };

            // Execute scanner
            const allFiles = await scanProject(scanRoot);

            // Filter files based on exclude patterns
            let results = allFiles;
            if (excludePatterns.length > 0) {
                results = allFiles.filter(file => {
                    // Check if file matches any exclude pattern
                    const isIgnored = excludePatterns.some(pattern => {
                        return matchesPattern(file.path, file.relativePath, pattern);
                    });
                    return !isIgnored;
                });
            }

            // Apply include patterns if specified
            if (params.include && params.include.length > 0) {
                results = results.filter(file => {
                    return params.include.some(pattern => {
                        return matchesPattern(file.path, file.relativePath, pattern);
                    });
                });
            }

            context.state.scan = {
                root: params.root || ".",
                count: results.length,
                timestamp: new Date().toISOString(),
                gitignore: {
                    applied: true,
                    rules: gitignoreRules.length
                },
                files: results
            };

            context.logs.push(
                `[SCAN] ${results.length} files scanned (gitignore rules: ${gitignoreRules.length})`
            );

            return {
                ok: true,
                count: results.length
            };
        }
    }
};
