import test from "node:test";
import assert from "node:assert/strict";

import { formatAgentSmokeFailure } from "../scripts/smoke-agent.js";

test("formatAgentSmokeFailure includes exit code stderr stdout and error", () => {
    const previousToken = process.env.AUTH_TOKEN;
    process.env.AUTH_TOKEN = "secret-token";

    try {
        const message = formatAgentSmokeFailure({
            code: 1,
            stderr: "Invalid URL: undefined",
            stdout: "partial output",
            error: new Error("spawn failed with secret-token")
        });

        assert.match(message, /exit 1/);
        assert.match(message, /stderr:\nInvalid URL: undefined/);
        assert.match(message, /stdout:\npartial output/);
        assert.match(message, /error: spawn failed with \[redacted\]/);
        assert.doesNotMatch(message, /secret-token/);
    } finally {
        if (previousToken === undefined) {
            delete process.env.AUTH_TOKEN;
        } else {
            process.env.AUTH_TOKEN = previousToken;
        }
    }
});
