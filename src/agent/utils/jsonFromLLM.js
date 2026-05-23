export function parseJsonFromText(text) {
    if (typeof text !== "string") {
        throw new Error("parseJsonFromText: expected text response from LLM");
    }

    const trimmed = text.trim();
    if (!trimmed) {
        throw new Error("parseJsonFromText: empty LLM response");
    }

    const candidates = [trimmed];
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) {
        candidates.unshift(fenced[1].trim());
    }

    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
    }

    let lastError = null;
    for (const candidate of candidates) {
        try {
            return JSON.parse(candidate);
        } catch (err) {
            lastError = err;
        }
    }

    throw new Error(`parseJsonFromText: failed to parse JSON from LLM response: ${lastError?.message || "invalid JSON"}`);
}
