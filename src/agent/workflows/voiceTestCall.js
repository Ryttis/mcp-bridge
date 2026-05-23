import { rpcCallOnce } from "../../bridge/rpcClient.js";
import { getServerUrl, getServerUrlWithToken } from "../kernel/serverUrl.js";

const DEFAULT_TIMEOUT_MS = 30000;
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;
const RESPONSE_MODES = new Set(["gather", "record"]);

export function parseVoiceTestCallArgs(args = []) {
    const options = {
        phone: null,
        dryRun: false,
        call: false,
        responseMode: "gather",
        json: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case "--phone":
                options.phone = args[++i];
                break;
            case "--dry-run":
                options.dryRun = true;
                break;
            case "--call":
                options.call = true;
                break;
            case "--response-mode":
                options.responseMode = args[++i];
                break;
            case "--json":
                options.json = true;
                break;
            default:
                throw new Error(`Unknown voice-test-call option: ${arg}`);
        }
    }

    validateVoiceTestCallOptions(options);
    return options;
}

export function parseVoiceCallIdArgs(args = [], commandName = "voice-status") {
    const options = {
        callId: null,
        json: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case "--call-id":
                options.callId = args[++i];
                break;
            case "--json":
                options.json = true;
                break;
            default:
                throw new Error(`Unknown ${commandName} option: ${arg}`);
        }
    }

    if (!options.callId || typeof options.callId !== "string") {
        throw new Error(`Missing --call-id.\nUsage: node bridge.js ${commandName} --call-id <callId> [--json]`);
    }

    return options;
}

export function validateVoiceTestCallOptions({ phone, dryRun, call, responseMode = "gather" } = {}) {
    if (!phone || typeof phone !== "string") {
        throw new Error("Missing --phone.\nUsage: node bridge.js voice-test-call --phone <phone> (--dry-run|--call) [--response-mode gather|record] [--json]");
    }

    if (!E164_PATTERN.test(phone)) {
        throw new Error("--phone must be an E.164 phone number, for example +37062071053");
    }

    if (dryRun && call) {
        throw new Error("Choose exactly one mode: --dry-run or --call.");
    }

    if (!dryRun && !call) {
        throw new Error("Missing call mode. Use exactly one of --dry-run or --call.");
    }

    if (!RESPONSE_MODES.has(responseMode)) {
        throw new Error("--response-mode must be one of: gather, record");
    }
}

export function buildVoiceOutboundParams(phoneNumber, { approved = false, responseMode = "gather" } = {}) {
    if (!RESPONSE_MODES.has(responseMode)) {
        throw new Error("responseMode must be one of: gather, record");
    }

    return {
        phoneNumber,
        language: "lt-LT",
        purpose: "test_call",
        approved,
        script: {
            intro: "Laba diena, čia MCP bandomasis skambutis.",
            questions: [
                "Prašome pasakyti: testas pavyko."
            ],
            closing: "Ačiū. Viso gero."
        },
        responseMode,
        gatherSpeech: responseMode === "gather",
        record: responseMode === "record",
        metadata: {
            source: "mcp-bridge voice-test-call"
        }
    };
}

async function callVoiceRpc(method, params, {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    serverUrl = getServerUrl(),
    token = process.env.AUTH_TOKEN,
    rpcCaller = rpcCallOnce
} = {}) {
    return await rpcCaller({
        url: getServerUrlWithToken({ serverUrl, token }),
        method,
        params,
        timeoutMs
    });
}

export async function runVoiceTestCall({
    phone,
    dryRun = false,
    call = false,
    responseMode = "gather",
    ...options
} = {}) {
    validateVoiceTestCallOptions({ phone, dryRun, call, responseMode });

    const params = buildVoiceOutboundParams(phone, { approved: call, responseMode });
    return await callVoiceRpc("voice.outboundCall", params, options);
}

export async function runVoiceTranscribe({ callId, ...options } = {}) {
    if (!callId || typeof callId !== "string") {
        throw new Error("voice-transcribe requires --call-id");
    }

    return await callVoiceRpc("voice.transcribe", { callId }, options);
}

export async function runVoiceStatus({ callId, ...options } = {}) {
    if (!callId || typeof callId !== "string") {
        throw new Error("voice-status requires --call-id");
    }

    return await callVoiceRpc("voice.getCallStatus", { callId }, options);
}

export async function runVoiceResult({ callId, ...options } = {}) {
    if (!callId || typeof callId !== "string") {
        throw new Error("voice-result requires --call-id");
    }

    return await callVoiceRpc("voice.getCallResult", { callId }, options);
}

export function formatVoiceTestCallSummary(result = {}) {
    const warnings = Array.isArray(result.warnings) ? result.warnings : [];
    return [
        "Voice test call:",
        `- provider: ${result.provider ?? ""}`,
        `- status: ${result.status ?? ""}`,
        `- callId: ${result.callId ?? ""}`,
        `- phoneNumber: ${result.phoneNumber ?? ""}`,
        `- warnings: ${warnings.length ? warnings.join(", ") : "none"}`
    ].join("\n");
}

export default {
    parseVoiceTestCallArgs,
    parseVoiceCallIdArgs,
    validateVoiceTestCallOptions,
    buildVoiceOutboundParams,
    runVoiceTestCall,
    runVoiceTranscribe,
    runVoiceStatus,
    runVoiceResult,
    formatVoiceTestCallSummary
};
