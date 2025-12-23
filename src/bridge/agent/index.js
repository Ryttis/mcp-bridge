import OpenAI from "openai";
import WebSocket from "ws";
import dotenv from "dotenv";
import path from "path";
import { readFromMCP } from "./readFromMCP.js"; // fallback-aware reader
dotenv.config();

const API_KEY = process.env.OPENAI_API_KEY;
const TOKEN = process.env.MCP_AUTH_TOKEN || "secret123";
const SERVER_URL = `ws://localhost:4000?token=${TOKEN}`;

/**
 * Launches the MCP improvement agent.
 * Reads file content via MCP (core_readFile) or falls back to local fs,
 * asks OpenAI to apply the requested doc-only improvement,
 * then writes a .bak backup and the improved file via MCP.
 *
 * @param {string} filePath - Path to the file to improve.
 * @param {string} [instructions="Add JSDoc header."] - AI instruction (doc-only).
 * @returns {Promise<void>}
 */
export async function improveFile(filePath, instructions = "Add JSDoc header.") {
    const client = new OpenAI({ apiKey: API_KEY });
    const ws = new WebSocket(SERVER_URL);
    const absPath = path.resolve(filePath);

    console.log(`🔍 Starting improvement pipeline for: ${absPath}`);
    console.log(`🧠 Instruction: ${instructions}`);

    return new Promise((resolve, reject) => {
        ws.on("open", async () => {
            try {
                console.log("🧠 Agent started for", absPath);

                // Read original (MCP → fallback to fs)
                const original = await readFromMCP(ws, absPath);
                console.log(`📦 File loaded (${original.length} chars)`);

                // Ask OpenAI to add doc header only (no logic changes)
                const completion = await client.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content:
                                "You are an MCP documentation assistant. Add one concise JSDoc header at the top describing purpose, params, and return value. Output ONLY raw valid JavaScript — no markdown, no commentary. Do not change any logic."
                        },
                        {
                            role: "user",
                            content: `File content:\n${original}\n\nInstruction:\n${instructions}`
                        }
                    ]
                });

                let improved = completion.choices?.[0]?.message?.content?.trim() || "";
                if (!improved) throw new Error("Empty AI response.");

                // Write .bak then improved file via MCP
                ws.send(JSON.stringify({
                    id: 2,
                    method: "core_writeFile",
                    params: { path: `${absPath}.bak`, content: original }
                }));

                ws.send(JSON.stringify({
                    id: 3,
                    method: "core_writeFile",
                    params: { path: absPath, content: improved }
                }));

                setTimeout(() => {
                    console.log(`✅ File updated & backup saved → ${absPath}.bak`);
                    ws.close();
                    resolve();
                }, 1000);
            } catch (err) {
                console.error("⚠️ Agent error:", err.message);
                ws.close();
                reject(err);
            }
        });

        ws.on("error", (err) => {
            console.error("⚠️ WebSocket error:", err.message);
            reject(err);
        });
    });
}

export { runRecipe } from "./runRecipe.js";

