import fs from "fs/promises";

export async function logStep(message) {
    const logLine = `[${new Date().toISOString()}] ${message}\n`;
    console.log(message);
    await fs.appendFile(".ai/context.md", logLine).catch(() => {});
}
