const DEFAULT_BASE_URL = process.env.MCP_MEMORY_URL || "http://127.0.0.1:3030";

async function postJson(url, body) {
    const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    return { status: res.status, ...json };
}

export async function memoryQuery({ query, topK = 5, filters = null, baseUrl = DEFAULT_BASE_URL }) {
    return postJson(`${baseUrl}/query`, { query, topK, filters });
}

export async function memoryIngest({ text, metadata = {}, baseUrl = DEFAULT_BASE_URL }) {
    return postJson(`${baseUrl}/ingest`, { text, metadata });
}
