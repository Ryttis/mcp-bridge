import fs from "fs";
import path from "path";

export const analyzeBehavior = {
    async run(context) {
        const files = context.state.scan?.files || [];

        const behavior = {
            files: {},
            summary: {
                fsRead: 0,
                fsWrite: 0,
                stateMutate: 0,
                networkCall: 0,
                pure: 0
            }
        };

        for (const file of files) {
            if (file.isBinary || file.skipped) continue;

            const absPath = path.join(context.rootPath, file.relativePath);

            let content;
            try {
                content = await fs.promises.readFile(absPath, "utf8");
            } catch {
                continue;
            }

            const effects = [];

            if (
                content.includes("fs.readFile") ||
                content.includes("fs.readFileSync") ||
                content.includes("fs.promises.readFile") ||
                content.includes("createReadStream")
            ) {
                effects.push("fs.read");
                behavior.summary.fsRead++;
            }

            if (
                content.includes("fs.writeFile") ||
                content.includes("fs.writeFileSync") ||
                content.includes("fs.promises.writeFile") ||
                content.includes("createWriteStream")
            ) {
                effects.push("fs.write");
                behavior.summary.fsWrite++;
            }

            if (
                content.includes("context.state.") ||
                content.includes("context.state[")
            ) {
                effects.push("state.mutate");
                behavior.summary.stateMutate++;
            }

            if (
                content.includes("fetch(") ||
                content.includes("axios") ||
                content.includes("rpcClient") ||
                content.includes("http.request") ||
                content.includes("https.request")
            ) {
                effects.push("network.call");
                behavior.summary.networkCall++;
            }

            if (effects.length === 0) {
                behavior.summary.pure++;
            } else {
                behavior.files[file.relativePath] = {
                    effects
                };
            }
        }

        context.state.behavior = behavior;

        context.logs.push(
            `[BEHAVIOR] Detected effects in ${Object.keys(behavior.files).length} files`
        );

        return {
            ok: true,
            affectedFiles: Object.keys(behavior.files).length
        };
    }
};
