import protocol from "mcp-protocol";

export const MCP_PROTOCOL = {
    name: "mcp-protocol",
    version: protocol.PROTOCOL_VERSION || "v1",
    mode: "mirror",
    enforcement: false,
    paths: protocol.paths
};

export default MCP_PROTOCOL;
