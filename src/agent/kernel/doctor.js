import { describeExecutionPlan } from "./targetMode.js";

export function buildDoctorReport(env = process.env) {
    return describeExecutionPlan(env);
}

export function formatDoctorReport(report) {
    return [
        "MCP bridge doctor:",
        `- MCP_TARGET_MODE: ${report.MCP_TARGET_MODE}`,
        `- MCP_SERVER_URL: ${report.MCP_SERVER_URL}`,
        `- serverHost: ${report.serverHost}`,
        `- local cwd: ${report.cwd}`,
        `- filesystemHost: ${report.filesystemHost}`,
        `- llmHost: ${report.llmHost}`,
        `- memoryHost: ${report.memoryHost}`,
        `- voiceHost: ${report.voiceHost}`,
        `- warnings: ${report.warnings.length ? report.warnings.join(" | ") : "none"}`
    ].join("\n");
}

export default {
    buildDoctorReport,
    formatDoctorReport
};
