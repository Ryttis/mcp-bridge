export function normalizeParts(parts) {
    if (!Array.isArray(parts) || parts.length === 0) {
        throw new Error("At least one part is required");
    }

    return parts.map((part, index) => {
        if (!part || typeof part !== "object") {
            throw new Error(`parts[${index}] must be an object`);
        }

        const name = typeof part.name === "string" ? part.name.trim() : "";
        if (!name) {
            throw new Error(`parts[${index}].name is required`);
        }

        return {
            name,
            notes: typeof part.notes === "string" ? part.notes.trim() : ""
        };
    });
}

export function buildPartPickList(parts) {
    return normalizeParts(parts).map((part, index) => ({
        id: `part-${index + 1}`,
        name: part.name,
        notes: part.notes
    }));
}
