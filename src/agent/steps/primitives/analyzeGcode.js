import fs from "fs/promises";

export async function analyzeGcode(ctx, params = {}) {
    const { filePath } = params;
    const content = await fs.readFile(filePath, "utf8");

    const lines = content.split("\n");
    const commands = lines.filter(l => l.trim().startsWith("G") || l.trim().startsWith("M"));

    return {
        filePath,
        lines: lines.length,
        commands: commands.length
    };
}
