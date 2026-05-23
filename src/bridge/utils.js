import { toolDescriptions } from "./descriptions.js";
import { rpcCallOnce } from "./rpcClient.js";

export async function listTools(serverUrl) {
    try {
        await rpcCallOnce({
            url: serverUrl,
            method: "core.listDir",
            params: { path: "./tools" },
            timeoutMs: 15000
        });
    } catch (err) {
        const code = err?.code || err?.kernelError?.code;

        // Server/kernel API mismatch or remote-fs guard: don't crash just because listDir isn't available.
        if (code !== "UNKNOWN_METHOD" && !String(err?.message || "").startsWith("Blocked filesystem RPC")) {
            throw err;
        }

        console.warn(`⚠️ Kernel tool listing unavailable; skipping remote filesystem tool listing.`);
    }

    console.log("\n🧩 Available Tools:\n");
    Object.entries(toolDescriptions).forEach(([key, desc]) => {
        console.log(`• ${key.padEnd(25)} — ${desc}`);
    });
}
