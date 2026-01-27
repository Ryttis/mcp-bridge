import { getTool } from "./toolRegistry.js";

/**
 * Routes incoming MCP JSON-RPC calls to local agent or memory tools.
 *
 * @param {string} method - RPC method name (e.g. "agent.readFile", "memory.query")
 * @param {object} params - Tool parameters
 * @param {object} context - Execution context
 */
export async function routeRpc(method, params = {}, context = {}) {
    const tool = getTool(method);
    return tool(context, params);
}
