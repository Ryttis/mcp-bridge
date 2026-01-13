import { toolDescriptions } from "./descriptions.js";
import { rpcCallOnce } from "./rpcClient.js";

export async function listTools(serverUrl) {
    try {
        await rpcCallOnce({
            url: serverUrl,
            method: "core_listDir",
            params: { path: "./tools" },
            timeoutMs: 15000
        });
    } catch (err) {
        const code = err?.code || err?.kernelError?.code;

        // Server/kernel API mismatch: don't crash the bridge just because listDir isn't available.
        if (code !== "UNKNOWN_METHOD") {
            throw err;
        }

        console.warn(`⚠️ Kernel does not expose core_listDir; skipping remote tool listing.`);
    }

    console.log("\n🧩 Available Tools:\n");
    Object.entries(toolDescriptions).forEach(([key, desc]) => {
        console.log(`• ${key.padEnd(25)} — ${desc}`);
    });
}