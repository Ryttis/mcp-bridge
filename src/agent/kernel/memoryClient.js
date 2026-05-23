import { rpcCallOnce } from "../../bridge/rpcClient.js";
import { getServerUrl, getServerUrlWithToken } from "./serverUrl.js";

const DEFAULT_TIMEOUT_MS = 60000;

async function callMemory(method, params, {
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

export async function memoryQuery({ query, topK = 5, ...options } = {}) {
    if (!query || typeof query !== "string") {
        throw new Error("memoryQuery: query must be a non-empty string");
    }

    return await callMemory("core.memoryQuery", { query, topK }, options);
}

export async function memoryIngest({ text, metadata, id, ...options } = {}) {
    if (!text || typeof text !== "string") {
        throw new Error("memoryIngest: text must be a non-empty string");
    }

    return await callMemory("core.memoryIngest", { text, metadata, id }, options);
}

export default {
    memoryQuery,
    memoryIngest
};
