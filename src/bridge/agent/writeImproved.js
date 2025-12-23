import { sleep } from "./utils.js";
import { logStep } from "./logger.js";

export async function writeImproved(ws, absPath, improved) {
    ws.send(JSON.stringify({
        id: 3,
        method: "core_writeFile",
        params: { path: absPath, content: improved }
    }));
    await sleep(200);
    await logStep(`✅ Improved file written → ${absPath}`);
}
