const store = new Map();

export async function cache(ctx, params = {}) {
    const { action, key, value } = params;

    if (action === "get") {
        return { value: store.get(key) };
    }

    if (action === "set") {
        store.set(key, value);
        return { ok: true };
    }

    if (action === "delete") {
        store.delete(key);
        return { ok: true };
    }

    if (action === "clear") {
        store.clear();
        return { ok: true };
    }

    throw new Error("Invalid cache action");
}
