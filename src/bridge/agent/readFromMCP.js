import fs from "fs/promises";

/**
 * Reads a file via the MCP WebSocket or falls back to local read.
 * @param {WebSocket} ws - Connected MCP WebSocket client.
 * @param {string} absPath - Absolute file path to read.
 * @returns {Promise<string>} File content.
 */
export async function readFromMCP(ws, absPath) {
    return new Promise(async (resolve, reject) => {
        const timeout = setTimeout(async () => {
            // 🧩 Fallback: if MCP tool is not ready, read locally
            try {
                const localContent = await fs.readFile(absPath, "utf8");
                console.log("⚙️ Fallback: read file locally (MCP core_readFile not yet available)");
                resolve(localContent);
            } catch (err) {
                reject(err);
            }
        }, 1500);

        ws.once("message", (msg) => {
            clearTimeout(timeout);
            try {
                const data = JSON.parse(msg);
                if (data.result?.content) resolve(data.result.content);
                else reject(new Error(data.error?.message || "Invalid MCP response"));
            } catch (e) {
                reject(e);
            }
        });

        ws.send(JSON.stringify({
            id: 1,
            method: "core_readFile",
            params: { path: absPath }
        }));
    });
}
