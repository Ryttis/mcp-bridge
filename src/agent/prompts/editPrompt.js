export function buildEditPrompt({ request, projectPath, scanSummary, memoryContext = "", files = [] }) {
    const fileBlocks = files.map((file) => [
        `--- FILE: ${file.path} ---`,
        file.content
    ].join("\n")).join("\n\n");

    return [
        "Return strict JSON only. Do not wrap it in Markdown.",
        "Produce safe full-file replacements for the requested change.",
        "Preserve existing behavior unless the user explicitly requested a behavior change.",
        "Do not expose or invent secrets. Do not add secret values.",
        "Do not invent new files unless necessary for the request.",
        "Only use relative paths from the project root.",
        "For this implementation, every edit action must be \"replace\" and content must be the full new file content.",
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
        "Files available for editing:",
        fileBlocks || "(none)",
        "",
        "Return exactly this JSON shape:",
        JSON.stringify({
            summary: "short edit summary",
            edits: [
                {
                    path: "relative/file.js",
                    action: "replace",
                    content: "full new file content"
                }
            ],
            notes: [],
            testsSuggested: []
        }, null, 2)
    ].join("\n");
}

export const EDIT_SYSTEM_PROMPT = "You are a careful local coding agent. Output strict JSON only.";
