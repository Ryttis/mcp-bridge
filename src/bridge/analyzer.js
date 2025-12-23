import OpenAI from "openai";
import WebSocket from "ws";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

export async function analyzeFile(serverUrl, token, filePath) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const ws = new WebSocket(`${serverUrl}?token=${token}`);

    return new Promise((resolve, reject) => {
        ws.on("open", () => {
            console.log(`🌉 Connected to MCP Server`);
            console.log(`📂 Requesting file: ${filePath}`);
            ws.send(
                JSON.stringify({
                    id: 1,
                    method: "core_readFile",
                    params: [path.resolve(filePath)],
                })
            );
        });

        ws.on("message", async (msg) => {
            try {
                const data = JSON.parse(msg);
                if (!data.result) return;
                const content = data.result.content || data.result;

                console.log(`📦 File received (${content.length} chars). Sending to ChatGPT...`);

                const res = await client.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: "system", content: "You are an AI code analyst." },
                        { role: "user", content: `Analyze this file:\n\n${content}` },
                    ],
                });

                console.log("\n🔍 ChatGPT Analysis:\n");
                console.log(res.choices[0].message.content.trim());
                resolve();
            } catch (err) {
                reject(err);
            } finally {
                ws.close();
            }
        });

        ws.on("error", (e) => reject(e));
    });
}
