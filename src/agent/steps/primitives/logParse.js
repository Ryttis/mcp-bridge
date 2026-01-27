import fs from "fs/promises";

export async function logParse(ctx, params = {}) {
    const { filePath, pattern } = params;
    const content = await fs.readFile(filePath, "utf8");
    const regex = new RegExp(pattern, "g");
    const matches = content.match(regex) || [];
    return { matches };
}
