// src/bridge/rpcClient.js
import WebSocket from "ws";

/**
 * Base bridge error type (adapter-only).
 * Wraps kernel ToolError (if present) without adding domain meaning.
 */
export class BridgeRpcError extends Error {
    constructor(message, { code = "KERNEL_ERROR", kernelError = null } = {}) {
        super(message);
        this.name = "BridgeRpcError";
        this.code = code;
        this.kernelError = kernelError;
    }
}

// Rules.json mappings:
export class BridgeTimeoutError extends BridgeRpcError {
    constructor(message, meta) {
        super(message, { ...meta, code: "TIMEOUT" });
        this.name = "BridgeTimeoutError";
    }
}

export class BridgeAuthError extends BridgeRpcError {
    constructor(message, meta) {
        super(message, { ...meta, code: "UNAUTHORIZED" });
        this.name = "BridgeAuthError";
    }
}

export class BridgeUnknownMethodError extends BridgeRpcError {
    constructor(message, meta) {
        super(message, { ...meta, code: "UNKNOWN_METHOD" });
        this.name = "BridgeUnknownMethodError";
    }
}

export class BridgeInternalError extends BridgeRpcError {
    constructor(message, meta) {
        super(message, { ...meta, code: "INTERNAL_ERROR" });
        this.name = "BridgeInternalError";
    }
}

export class BridgeKernelError extends BridgeRpcError {
    constructor(message, meta) {
        super(message, { ...meta, code: meta?.code || "KERNEL_ERROR" });
        this.name = "BridgeKernelError";
    }
}

/**
 * Map kernel ToolError -> bridge error type.
 * Preserves kernel payload as `.kernelError`.
 */
export function mapKernelError(kernelError) {
    const code = kernelError?.code || "KERNEL_ERROR";
    const message = kernelError?.message || "Kernel error";
    const meta = { code, kernelError };

    switch (code) {
        case "TIMEOUT":
            return new BridgeTimeoutError(message, meta);
        case "UNAUTHORIZED":
            return new BridgeAuthError(message, meta);
        case "UNKNOWN_METHOD":
            return new BridgeUnknownMethodError(message, meta);
        case "INTERNAL_ERROR":
            return new BridgeInternalError(message, meta);
        default:
            return new BridgeKernelError(message, meta);
    }
}

/**
 * Make a single JSON-RPC call and close the socket (CLI-friendly).
 */
export async function rpcCallOnce({ url, method, params, timeoutMs = 30000 }) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(url);
        const id = 1;
        let settled = false;

        const done = (fn) => (value) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            try {
                ws.close();
            } catch {}
            fn(value);
        };

        const resolveOnce = done(resolve);
        const rejectOnce = done(reject);

        const timer = setTimeout(() => {
            rejectOnce(
                new BridgeTimeoutError(`RPC timed out after ${timeoutMs} ms`, {
                    kernelError: { code: "TIMEOUT", message: `RPC timed out after ${timeoutMs} ms` },
                })
            );
        }, timeoutMs);

        ws.on("open", () => {
            ws.send(JSON.stringify({ jsonrpc: "2.0", id, method, params }));
        });

        ws.on("message", (msg) => {
            let data;
            try {
                data = JSON.parse(msg.toString());
            } catch {
                return;
            }

            if (data?.id !== id) return;

            if (data?.error) {
                rejectOnce(mapKernelError(data.error));
                return;
            }

            resolveOnce(data.result);
        });

        ws.on("error", (err) => {
            rejectOnce(new BridgeRpcError(err.message || "WebSocket error", { code: "TRANSPORT_ERROR" }));
        });

        ws.on("close", () => {
            if (!settled) {
                rejectOnce(new BridgeRpcError("Connection closed before response", { code: "TRANSPORT_CLOSED" }));
            }
        });
    });
}

/**
 * Persistent JSON-RPC client for interactive sessions.
 * Adapter-only transport.
 */
export class RpcClient {
    constructor({ url, timeoutMs = 30000 } = {}) {
        this.url = url;
        this.timeoutMs = timeoutMs;

        this.ws = null;
        this.connected = false;

        this.nextId = 1;
        this.pending = new Map();
    }

    async connect() {
        if (this.connected) return;

        this.ws = new WebSocket(this.url);

        await new Promise((resolve, reject) => {
            const onOpen = () => {
                cleanup();
                this.connected = true;
                resolve();
            };

            const onError = (err) => {
                cleanup();
                reject(new BridgeRpcError(err.message || "WebSocket error", { code: "TRANSPORT_ERROR" }));
            };

            const cleanup = () => {
                this.ws?.off("open", onOpen);
                this.ws?.off("error", onError);
            };

            this.ws.on("open", onOpen);
            this.ws.on("error", onError);
        });

        this.ws.on("message", (msg) => {
            let data;
            try {
                data = JSON.parse(msg.toString());
            } catch {
                return;
            }

            const id = data?.id;
            if (!id) return;

            const pending = this.pending.get(id);
            if (!pending) return;

            this.pending.delete(id);
            clearTimeout(pending.timer);

            if (data?.error) {
                pending.reject(mapKernelError(data.error));
                return;
            }

            pending.resolve(data.result);
        });

        this.ws.on("close", () => {
            this.connected = false;

            for (const [, pending] of this.pending) {
                clearTimeout(pending.timer);
                pending.reject(new BridgeRpcError("Connection closed", { code: "TRANSPORT_CLOSED" }));
            }
            this.pending.clear();
        });
    }

    async call(method, params) {
        if (!this.connected) await this.connect();

        const id = this.nextId++;

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(
                    new BridgeTimeoutError(`RPC timed out after ${this.timeoutMs} ms`, {
                        kernelError: { code: "TIMEOUT", message: `RPC timed out after ${this.timeoutMs} ms` },
                    })
                );
            }, this.timeoutMs);

            this.pending.set(id, { resolve, reject, timer });

            this.ws.send(JSON.stringify({ jsonrpc: "2.0", id, method, params }));
        });
    }

    close() {
        try {
            this.ws?.close();
        } catch {}
    }
}