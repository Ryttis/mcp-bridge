import { callMCP } from "../../integration/mcp.js";

export async function run(context, step = {}, params = {}) {
    const query = step.query || params.query || context.state?.memoryQuery || context.memoryQuery;
    const topK = step.topK ?? params.topK;

    if (!query || typeof query !== "string") {
        throw new Error("memoryQuery: query must be a non-empty string");
    }

    const result = await callMCP("core.memoryQuery", { query, topK });
    const results = Array.isArray(result?.results) ? result.results : [];

    return {
        mutations: {
            memoryResults: results,
            state: {
                ...context.state,
                memoryQuery: {
                    query,
                    result
                }
            }
        }
    };
}

export default {
    id: "memoryQuery",
    run
};
