import { callMCP } from "../../integration/mcp.js";

export async function run(context, step = {}, params = {}) {
    const text = step.text || params.text || context.state?.memoryText || context.memoryText;
    const id = step.id || params.id;
    const metadata = step.metadata || params.metadata;

    if (!text || typeof text !== "string") {
        throw new Error("memoryIngest: text must be a non-empty string");
    }

    const result = await callMCP("core.memoryIngest", { text, id, metadata });

    return {
        mutations: {
            memoryIngestResult: result,
            state: {
                ...context.state,
                memoryIngest: result
            }
        }
    };
}

export default {
    id: "memoryIngest",
    run
};
