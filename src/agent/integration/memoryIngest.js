import { ingestText } from "mcp-memory";

export async function memoryIngest(ctx, params = {}) {
    const { text, metadata = {} } = params;
    await ingestText(text, metadata);
    return { ok: true };
}
