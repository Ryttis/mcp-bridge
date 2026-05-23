import test from "node:test";
import assert from "node:assert/strict";

import { parseJsonFromText } from "../src/agent/utils/jsonFromLLM.js";

test("parseJsonFromText parses raw JSON", () => {
    assert.deepEqual(parseJsonFromText("{\"ok\":true}"), { ok: true });
});

test("parseJsonFromText parses fenced JSON", () => {
    const text = "```json\n{\"ok\":true,\"items\":[1]}\n```";
    assert.deepEqual(parseJsonFromText(text), { ok: true, items: [1] });
});

test("parseJsonFromText throws a clear error for invalid JSON", () => {
    assert.throws(() => parseJsonFromText("not json"), /failed to parse JSON/);
});
