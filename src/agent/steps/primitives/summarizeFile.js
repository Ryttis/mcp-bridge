import fs from "fs/promises";

export async function summarizeFile(ctx, params = {}) {
    const { filePath, lines = 50 } = params;
    const content = await fs.readFile(filePath, "utf8");
    const parts = content.split("\n");
    return { summary: parts.slice(0, lines).join("\n") };
}
