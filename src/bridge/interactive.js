import readline from "readline";
import { RpcClient } from "./rpcClient.js";

export function startInteractiveBridge(serverUrl) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const client = new RpcClient({ url: serverUrl, timeoutMs: 30000 });

    (async () => {
        try {
            await client.connect();
            console.log(`✅ Connected to MCP server: ${serverUrl}`);
            prompt();
        } catch (err) {
            const code = err?.code || err?.kernelError?.code || "ERROR";
            console.error(`❌ Error [${code}]: ${err.message}`);
            process.exit(1);
        }
    })();

    function prompt() {
        rl.question("> ", async (line) => {
            const input = line.trim();

            if (["clear", "cls", "c"].includes(input)) {
                process.stdout.write("\x1Bc");
                return prompt();
            }

            if (input === "exit") {
                try { client.close(); } catch {}
                process.exit(0);
            }

            const spaceIndex = input.indexOf(" ");
            const method = spaceIndex === -1 ? input : input.slice(0, spaceIndex);
            const rawParams = spaceIndex === -1 ? "" : input.slice(spaceIndex + 1).trim();

            let params = {};

            if (rawParams) {
                try {
                    params = JSON.parse(rawParams);
                    if (typeof params !== "object" || params === null || Array.isArray(params)) {
                        throw new Error("Params must be a JSON object");
                    }
                } catch {
                    console.error("❌ Error [INVALID_PARAMS]: Params must be a JSON object");
                    return prompt();
                }
            }

            try {
                const result = await client.call(method, params);
                console.log("📡 Response:", result);
            } catch (err) {
                const code = err?.code || err?.kernelError?.code || "ERROR";
                console.error(`❌ Error [${code}]: ${err.message}`);
            }

            prompt();
        });
    }

    process.on("SIGINT", () => {
        try { client.close(); } catch {}
        process.exit(0);
    });
}
