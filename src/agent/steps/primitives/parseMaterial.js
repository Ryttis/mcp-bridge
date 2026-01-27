import fs from "fs/promises";

export async function parseMaterial(ctx, params = {}) {
    const { filePath } = params;
    const content = await fs.readFile(filePath, "utf8");

    const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
    const materials = [];

    for (const line of lines) {
        const [name, ...rest] = line.split(/\s+/);
        materials.push({
            name,
            raw: line,
            tokens: rest
        });
    }

    return { materials };
}
