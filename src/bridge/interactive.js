import readline from "readline";
import { RpcClient } from "./rpcClient.js";

export function startInteractiveBridge(serverUrl) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const client = new RpcClient({ url: serverUrl, timeoutMs: 30000 });

    let idHint = 1;

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
            const cmd = line.trim();

            // clear terminal command
            if (["clear", "cls", "c"].includes(cmd)) {
                process.stdout.write("\x1Bc");
                return prompt();
            }

            // exit
            if (cmd === "exit") {
                try { client.close(); } catch {}
                process.exit(0);
            }

            // method + args (kept identical to previous behavior)
            const [method, ...args] = cmd.split(" ");

            try {
                const result = await client.call(method, args);
                console.log("📡 Response:", result);
            } catch (err) {
                const code = err?.code || err?.kernelError?.code || "ERROR";
                console.error(`❌ Error [${code}]: ${err.message}`);
            }

            idHint++;
            prompt();
        });
    }

    process.on("SIGINT", () => {
        try { client.close(); } catch {}
        process.exit(0);
    });
}