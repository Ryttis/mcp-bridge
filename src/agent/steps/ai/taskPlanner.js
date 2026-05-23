import { llmComplete } from "../../kernel/llmClient.js";

async function callKernelLlm({ prompt }) {
    return await llmComplete({
        prompt,
        response_format: "json"
    });
}

function safeJsonParse(maybeString) {
    if (maybeString && typeof maybeString === "object") return maybeString;

    if (typeof maybeString !== "string") {
        throw new Error("Kernel LLM returned non-string, non-object response.");
    }

    const trimmed = maybeString.trim();

    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    const candidate =
        firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace
            ? trimmed.slice(firstBrace, lastBrace + 1)
            : trimmed;

    return JSON.parse(candidate);
}

export async function taskPlanner(ctx, step) {
    const task = ctx?.params?.task || ctx?.task || step?.task || null;

    if (!task) {
        throw new Error(
            "taskPlanner: Missing task. Ensure recipe passes params.task or earlier step loads it into ctx.params.task."
        );
    }

    const fileAnalysis =
        ctx?.outputs?.analysis ||
        ctx?.state?.fileAnalysis ||
        null;

    const targetFile =
        task?.target_file ||
        task?.targetFile ||
        null;

    const prompt = [
        "You are a strict planning engine for a deterministic refactor pipeline.",
        "Return ONLY valid JSON. No markdown. No commentary.",
        "",
        "Goal: Convert an input task + (optional) file analysis into an executable plan.",
        "",
        "JSON schema to return:",
        "{",
        '  "plan": {',
        '    "targetFile": "string",',
        '    "assumptions": ["string"],',
        '    "checks": ["string"],',
        '    "changes": [',
        "      {",
        '        "id": "string",',
        '        "title": "string",',
        '        "why": "string",',
        '        "operations": [',
        "          {",
        '            "op": "replace_range" | "replace_block" | "insert_after" | "insert_before" | "delete_block" | "note",',
        '            "locator": { "type": "line" | "regex" | "anchor", "value": "string" },',
        '            "content": "string"',
        "          }",
        "        ]",
        "      }",
        "    ]",
        "  }",
        "}",
        "",
        "Input task JSON:",
        JSON.stringify(task),
        "",
        "Optional file analysis JSON (may be null):",
        JSON.stringify(fileAnalysis)
    ].join("\n");

    const raw = await callKernelLlm({ prompt });
    const parsed = safeJsonParse(raw);

    if (!parsed?.plan?.changes || !Array.isArray(parsed.plan.changes)) {
        throw new Error("taskPlanner: Invalid plan JSON returned by kernel (missing plan.changes[]).");
    }

    if (!parsed.plan.targetFile) {
        parsed.plan.targetFile = targetFile || "UNKNOWN";
    }

    return {
        mutations: {
            outputs: {
                plan: parsed.plan
            }
        }
    };
}
