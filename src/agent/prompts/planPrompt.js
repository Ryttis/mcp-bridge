export function buildPlanPrompt({ request, projectPath, scanSummary, memoryContext = "" }) {
    return [
        "Return strict JSON only. Do not wrap it in Markdown.",
        "You are planning a small, safe local code edit. Do not produce file edits yet.",
        "Choose the minimal set of files that must be read before editing.",
        "Only use relative paths from the project root.",
        "",
        `Project path: ${projectPath}`,
        `User request: ${request}`,
        "",
        "Relevant memory context:",
        memoryContext || "(none)",
        "",
        "Project scan summary:",
        scanSummary,
        "",
        "Return exactly this JSON shape:",
        JSON.stringify({
            summary: "short plan summary",
            filesToRead: ["relative/path.js"],
            risks: [],
            steps: []
        }, null, 2)
    ].join("\n");
}

export const PLAN_SYSTEM_PROMPT = "You are a careful local coding agent. Output strict JSON only.";
