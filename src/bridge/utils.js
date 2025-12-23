// src/bridge/utils.js
import WebSocket from "ws";
import { toolDescriptions } from "./descriptions.js";

export async function listTools(serverUrl) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(serverUrl);

        ws.on("open", () => {
            // ✅ Proper JSON-RPC message
            ws.send(JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "core_listDir",
                params: { path: "./tools" }
            }));
        });

        ws.on("message", (msg) => {
            try {
                const data = JSON.parse(msg);
                if (!data.result) return;

                console.log("\n🧩 Available Tools:\n");
                Object.entries(toolDescriptions).forEach(([key, desc]) => {
                    console.log(`• ${key.padEnd(25)} — ${desc}`);
                });

                ws.close();
                resolve();
            } catch (err) {
                reject(err);
            }
        });

        ws.on("error", (err) => reject(err));
    });
}
