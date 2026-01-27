import * as primitives from "../agent/steps/primitives/index.js";
import { memoryQuery } from "../agent/integration/index.js";
import { memoryIngest } from "../agent/integration/index.js";

export const TOOL_REGISTRY = {
    "agent.listDir": primitives.listDir,
    "agent.readFile": primitives.readFile,
    "agent.writeFile": primitives.writeFile,
    "agent.runCommand": primitives.runCommand,
    "agent.cache": primitives.cache,
    "agent.readProjectFile": primitives.readProjectFile,
    "agent.logParse": primitives.logParse,
    "agent.logSummarize": primitives.logSummarize,
    "agent.analyzeFile": primitives.analyzeFile,
    "agent.analyzeGcode": primitives.analyzeGcode,
    "agent.projectStatus": primitives.projectStatus,
    "agent.snapshotServer": primitives.snapshotServer,
    "agent.snapshotTool": primitives.snapshotTool,
    "agent.getLastScan": primitives.getLastScan,
    "agent.setLastContext": primitives.setLastContext,
    "agent.restoreSnapshot": primitives.restoreSnapshot,

    "memory.query": memoryQuery,
    "memory.ingest": memoryIngest,
};

export function getTool(name) {
    const tool = TOOL_REGISTRY[name];
    if (!tool) {
        throw new Error(`Bridge tool not found: ${name}`);
    }
    return tool;
}
