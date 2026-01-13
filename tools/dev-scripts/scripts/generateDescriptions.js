/**
 * 🧩 MCP Tool Description Generator
 * Scans all /tools/ .js files and builds /src/bridge/descriptions.js
*/
import fs from "fs";
import path from "path";

const ROOT = path.resolve("./");
const TOOLS_DIR = path.join(ROOT, "tools");
const OUTPUT_FILE = path.join(ROOT, "src/bridge/descriptions.js");

const descriptions = {};

function scanDir(dir, prefix = "") {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            const newPrefix = prefix ? `${prefix}_${file.name}` : file.name;
            scanDir(fullPath, newPrefix);
            continue;
        }

        if (!file.name.endsWith(".js")) continue;
        const baseName = path.basename(file.name, ".js");
        const key = `${prefix}_${baseName}`;

        const content = fs.readFileSync(fullPath, "utf-8");
        let description =
            (content.match(/description\s*:\s*(["'`])(.*?)\1/)?.[2]) ||
            (content.match(/\/\*\*([\s\S]*?)\*\//)?.[1]
                ?.split("\n")
                ?.find((l) => l.toLowerCase().includes("description"))
                ?.replace(/[*\/]/g, "")
                ?.trim()) ||
            "No description provided.";

        descriptions[key] = description;
    }
}

scanDir(TOOLS_DIR);

const header = `/**
 * ⚙️ Auto-generated tool descriptions
 * Run: node scripts/generateDescriptions.js
 * Do not edit manually.
 */
export const toolDescriptions = ${JSON.stringify(descriptions, null, 2)};\n`;

fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
fs.writeFileSync(OUTPUT_FILE, header, "utf-8");

console.log(`✅ Generated ${Object.keys(descriptions).length} tool descriptions → ${OUTPUT_FILE}`);
