import { queryMemory } from "mcp-memory";

export async function memoryQuery(ctx, params = {}) {
    const text = params.text;
    const topK = Number(params.topK || 5);

    const results = await queryMemory(text, topK);
    return { results };
}
