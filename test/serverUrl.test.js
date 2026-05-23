import test from "node:test";
import assert from "node:assert/strict";

import { getServerUrl, getServerUrlWithToken } from "../src/agent/kernel/serverUrl.js";

test("getServerUrl uses localhost default", () => {
    assert.equal(getServerUrl({}), "ws://localhost:4000");
});

test("getServerUrl uses PORT fallback", () => {
    assert.equal(getServerUrl({ PORT: "4100" }), "ws://localhost:4100");
});

test("getServerUrl prefers MCP_SERVER_URL", () => {
    assert.equal(getServerUrl({ MCP_SERVER_URL: "ws://localhost:5000", PORT: "4100" }), "ws://localhost:5000");
});

test("getServerUrlWithToken appends auth token", () => {
    assert.equal(
        getServerUrlWithToken({ serverUrl: "ws://localhost:5000", token: "abc" }),
        "ws://localhost:5000/?token=abc"
    );
});

test("getServerUrlWithToken preserves existing query params", () => {
    assert.equal(
        getServerUrlWithToken({ serverUrl: "ws://localhost:5000?mode=test", token: "abc" }),
        "ws://localhost:5000/?mode=test&token=abc"
    );
});

test("getServerUrlWithToken URL-encodes auth token", () => {
    assert.equal(
        getServerUrlWithToken({ serverUrl: "ws://localhost:5000", token: "a b+c&d" }),
        "ws://localhost:5000/?token=a+b%2Bc%26d"
    );
});
