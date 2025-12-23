import WebSocket from "ws";
import readline from "readline";

export function startInteractiveBridge(serverUrl) {
    const ws = new WebSocket(serverUrl);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    ws.on("open", () => {
        console.log(`✅ Connected to MCP server: ${serverUrl}`);
        prompt();
    });

    ws.on("message", (msg) => {
        console.log("📡 Response:", msg.toString());
        prompt();
    });

    ws.on("error", (err) => console.error("⚠️ WebSocket error:", err.message));
    ws.on("close", () => {
        console.log("❌ Disconnected from MCP server");
        process.exit(0);
    });

    let id = 1;

    function prompt() {
        rl.question("> ", (line) => {

            // 🧹 CLEAR TERMINAL COMMAND
            const cmd = line.trim();
            if (["clear", "cls", "c"].includes(cmd)) {
                process.stdout.write("\x1Bc"); // clears full terminal buffer
                return prompt();               // show new prompt immediately
            }

            // 📴 EXIT command
            if (cmd === "exit") return process.exit(0);

            // 🧩 Normal tool call
            const [method, ...args] = cmd.split(" ");
            ws.send(JSON.stringify({ id: id++, method, params: args }));
        });
    }
}
