import { routeRpc } from "./rpcRouter.js";
import { BridgeUnknownMethodError, BridgeInternalError } from "./rpcClient.js";

export async function handleRpcCall(rpcRequest) {
    const { method, params, id } = rpcRequest;

    try {
        const result = await routeRpc(method, params, {
            requestId: id,
            source: "bridge",
            timestamp: Date.now(),
        });

        return {
            jsonrpc: "2.0",
            id,
            result,
        };
    } catch (err) {
        if (err instanceof BridgeUnknownMethodError) {
            return {
                jsonrpc: "2.0",
                id,
                error: {
                    code: err.code,
                    message: err.message,
                    kernelError: err.kernelError,
                },
            };
        }

        return {
            jsonrpc: "2.0",
            id,
            error: {
                code: "INTERNAL_ERROR",
                message: err.message || "Bridge execution failed",
            },
        };
    }
}
