import WebSocket from "ws";
import path from "path";

/**
 * Adapter-only placeholder.
 * Analysis logic has been moved to MCP Server kernel.
 */
export async function analyzeFile(serverUrl, token, filePath) {
    const ws = new WebSocket(`${serverUrl}?token=${token}`);
    const absPath = path.resolve(filePath);

    return new Promise((_, reject) => {
        ws.on("open", () => {
            console.error("❌ analyze is no longer implemented in bridge.");
            console.error("👉 Use a kernel tool (e.g., core.analyzeFile) instead.");
            ws.close();
            reject(new Error("analyze moved to kernel"));
        });

        ws.on("error", (err) => reject(err));
    });
}
