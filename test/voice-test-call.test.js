import test from "node:test";
import assert from "node:assert/strict";

import {
    buildVoiceOutboundParams,
    parseVoiceTestCallArgs,
    runVoiceResult,
    runVoiceStatus,
    runVoiceTranscribe,
    runVoiceTestCall
} from "../src/agent/workflows/voiceTestCall.js";

test("voice-test-call dry-run builds expected params without call approval", async () => {
    let request;

    const result = await runVoiceTestCall({
        phone: "+37062071053",
        dryRun: true,
        rpcCaller: async (rpcRequest) => {
            request = rpcRequest;
            return {
                ok: true,
                provider: "mock",
                status: "mock_queued",
                callId: "call_123",
                phoneNumber: rpcRequest.params.phoneNumber,
                warnings: []
            };
        }
    });

    assert.equal(request.method, "voice.outboundCall");
    assert.deepEqual(request.params, buildVoiceOutboundParams("+37062071053", { approved: false }));
    assert.equal(request.params.responseMode, "gather");
    assert.equal(request.params.gatherSpeech, true);
    assert.equal(request.params.record, false);
    assert.equal(result.ok, true);
    assert.equal(result.provider, "mock");
});

test("voice-test-call --call builds expected params with call approval", async () => {
    let request;

    const result = await runVoiceTestCall({
        phone: "+37062071053",
        call: true,
        rpcCaller: async (rpcRequest) => {
            request = rpcRequest;
            return {
                ok: true,
                provider: "twilio",
                status: "queued",
                callId: "call_123",
                phoneNumber: rpcRequest.params.phoneNumber,
                warnings: []
            };
        }
    });

    assert.equal(request.method, "voice.outboundCall");
    assert.deepEqual(request.params, buildVoiceOutboundParams("+37062071053", { approved: true }));
    assert.equal(result.ok, true);
    assert.equal(result.provider, "twilio");
});

test("voice-test-call accepts --response-mode record and passes it to voice.outboundCall", async () => {
    const parsed = parseVoiceTestCallArgs([
        "--phone",
        "+37062071053",
        "--call",
        "--response-mode",
        "record",
        "--json"
    ]);
    let request;

    const result = await runVoiceTestCall({
        phone: parsed.phone,
        call: parsed.call,
        responseMode: parsed.responseMode,
        rpcCaller: async (rpcRequest) => {
            request = rpcRequest;
            return {
                ok: true,
                provider: "twilio",
                status: "queued",
                callId: "call_123",
                phoneNumber: rpcRequest.params.phoneNumber,
                responseMode: rpcRequest.params.responseMode,
                warnings: []
            };
        }
    });

    assert.equal(parsed.responseMode, "record");
    assert.equal(request.method, "voice.outboundCall");
    assert.deepEqual(request.params, buildVoiceOutboundParams("+37062071053", {
        approved: true,
        responseMode: "record"
    }));
    assert.equal(request.params.gatherSpeech, false);
    assert.equal(request.params.record, true);
    assert.equal(result.responseMode, "record");
});

test("voice-test-call rejects invalid --response-mode", () => {
    assert.throws(
        () => parseVoiceTestCallArgs([
            "--phone",
            "+37062071053",
            "--call",
            "--response-mode",
            "invalid"
        ]),
        /--response-mode must be one of: gather, record/
    );
});

test("voice-test-call requires a mode", async () => {
    assert.throws(
        () => parseVoiceTestCallArgs(["--phone", "+37062071053"]),
        /Missing call mode/
    );

    await assert.rejects(
        runVoiceTestCall({ phone: "+37062071053" }),
        /Missing call mode/
    );
});

test("voice-test-call rejects both modes", async () => {
    assert.throws(
        () => parseVoiceTestCallArgs(["--phone", "+37062071053", "--dry-run", "--call"]),
        /exactly one/
    );

    await assert.rejects(
        runVoiceTestCall({ phone: "+37062071053", dryRun: true, call: true }),
        /exactly one/
    );
});

test("voice-test-call rejects missing phone", () => {
    assert.throws(
        () => parseVoiceTestCallArgs(["--dry-run"]),
        /Missing --phone/
    );
});

test("voice-test-call rejects invalid phone", () => {
    assert.throws(
        () => parseVoiceTestCallArgs(["--phone", "37062071053", "--dry-run"]),
        /E\.164/
    );
});

test("voice-test-call --json mode is parseable", async () => {
    const result = await runVoiceTestCall({
        phone: "+37062071053",
        dryRun: true,
        rpcCaller: async () => ({
            ok: true,
            provider: "mock",
            status: "mock_queued",
            callId: "call_123",
            phoneNumber: "+37062071053",
            warnings: []
        })
    });

    const parsed = JSON.parse(`${JSON.stringify(result)}\n`);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.provider, "mock");
    assert.equal(parsed.status, "mock_queued");
});

test("voice-status calls voice.getCallStatus", async () => {
    let request;

    const result = await runVoiceStatus({
        callId: "call_123",
        rpcCaller: async (rpcRequest) => {
            request = rpcRequest;
            return { ok: true, status: "mock_queued" };
        }
    });

    assert.equal(request.method, "voice.getCallStatus");
    assert.deepEqual(request.params, { callId: "call_123" });
    assert.deepEqual(result, { ok: true, status: "mock_queued" });
});

test("voice-result calls voice.getCallResult", async () => {
    let request;

    const result = await runVoiceResult({
        callId: "call_123",
        rpcCaller: async (rpcRequest) => {
            request = rpcRequest;
            return { ok: true, transcript: "testas pavyko" };
        }
    });

    assert.equal(request.method, "voice.getCallResult");
    assert.deepEqual(request.params, { callId: "call_123" });
    assert.deepEqual(result, { ok: true, transcript: "testas pavyko" });
});

test("voice-transcribe calls voice.transcribe", async () => {
    let request;

    const result = await runVoiceTranscribe({
        callId: "twilio-call-123",
        rpcCaller: async (rpcRequest) => {
            request = rpcRequest;
            return { ok: true, provider: "none", recordingsFound: 1, transcriptionPendingAnswersFound: 1 };
        }
    });

    assert.equal(request.method, "voice.transcribe");
    assert.deepEqual(request.params, { callId: "twilio-call-123" });
    assert.equal(result.provider, "none");
});
