import test from "node:test";
import assert from "node:assert/strict";

import { llmComplete } from "../src/agent/kernel/llmClient.js";

test("llmClient imports without server or OPENAI_API_KEY", () => {
    assert.equal(typeof llmComplete, "function");
});

test("llmComplete calls core.llmComplete through injected RPC caller", async () => {
    const result = await llmComplete({
        prompt: "Return JSON",
        systemPrompt: "System",
        model: "test-model",
        response_format: "json",
        serverUrl: "ws://localhost:4444",
        token: "test-token",
        rpcCaller: async (request) => {
            assert.equal(request.method, "core.llmComplete");
            assert.equal(request.timeoutMs, 130000);
            assert.equal(request.params.prompt, "Return JSON");
            assert.equal(request.params.systemPrompt, "System");
            assert.equal(request.params.model, "test-model");
            assert.equal(request.params.response_format, "json");
            assert.match(request.url, /^ws:\/\/localhost:4444\/\?token=test-token$/);
            return { text: "{\"ok\":true}" };
        }
    });

    assert.equal(result, "{\"ok\":true}");
});

test("llmComplete derives valid RPC URL from MCP_SERVER_URL and AUTH_TOKEN", async () => {
    const previousServerUrl = process.env.MCP_SERVER_URL;
    const previousToken = process.env.AUTH_TOKEN;
    process.env.MCP_SERVER_URL = "ws://localhost:4555?existing=1";
    process.env.AUTH_TOKEN = "local test token";

    try {
        await llmComplete({
            prompt: "Reply ok",
            rpcCaller: async (request) => {
                assert.equal(typeof request.url, "string");
                assert.notEqual(request.url, "undefined");
                assert.equal(request.url, "ws://localhost:4555/?existing=1&token=local+test+token");
                assert.equal(request.method, "core.llmComplete");
                assert.equal(request.params.prompt, "Reply ok");
                assert.equal(request.timeoutMs, 130000);
                return "ok";
            }
        });
    } finally {
        if (previousServerUrl === undefined) {
            delete process.env.MCP_SERVER_URL;
        } else {
            process.env.MCP_SERVER_URL = previousServerUrl;
        }

        if (previousToken === undefined) {
            delete process.env.AUTH_TOKEN;
        } else {
            process.env.AUTH_TOKEN = previousToken;
        }
    }
});
