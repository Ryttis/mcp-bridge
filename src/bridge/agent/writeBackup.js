import { sleep } from "./utils.js";
import { logStep } from "./logger.js";

export async function writeBackup(ws, absPath, original) {
    const backupPath = absPath + ".bak";
    ws.send(JSON.stringify({
        id: 2,
        method: "core_writeFile",
        params: { path: backupPath, content: original }
    }));
    await sleep(200);
    await logStep(`💾 Backup created → ${backupPath}`);
}
