import { rpcCallOnce } from "../../bridge/rpcClient.js";
import { getServerUrl, getServerUrlWithToken } from "./serverUrl.js";

const DEFAULT_TIMEOUT_MS = 130000;

function unwrapCompletionResult(result) {
    if (typeof result === "string") return result;

    if (result && typeof result === "object") {
        if (typeof result.text === "string") return result.text;
        if (typeof result.content === "string") return result.content;
        if (typeof result.completion === "string") return result.completion;
    }

    return result;
}

export async function llmComplete({
    prompt,
    systemPrompt,
    model,
    response_format,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    serverUrl = getServerUrl(),
    token = process.env.AUTH_TOKEN,
    rpcCaller = rpcCallOnce
} = {}) {
    if (!prompt || typeof prompt !== "string") {
        throw new Error("llmComplete: prompt must be a non-empty string");
    }

    const result = await rpcCaller({
        url: getServerUrlWithToken({ serverUrl, token }),
        method: "core.llmComplete",
        params: {
            prompt,
            systemPrompt,
            model,
            response_format
        },
        timeoutMs
    });

    return unwrapCompletionResult(result);
}

export default {
    llmComplete
};
