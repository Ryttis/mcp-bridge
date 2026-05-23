import { llmComplete } from "../../kernel/llmClient.js";

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

export async function refactorTwig(ctx, step) {
    const plan = ctx.outputs?.plan;
    const file = ctx.outputs?.file;

    if (!plan) {
        throw new Error("refactorTwig: Missing plan from ctx.outputs.plan");
    }

    if (!file || typeof file.content !== "string") {
        throw new Error("refactorTwig: Missing original file content from ctx.outputs.file.content");
    }

    const prompt = [
        "You are a strict refactor engine.",
        "Return ONLY valid JSON. No markdown. No commentary.",
        "",
        "Task: Apply the plan operations to the provided Twig template and return the full updated file content.",
        "Rules:",
        "- Preserve Twig syntax correctness.",
        "- Do not add nested <td> in <td>.",
        "- Keep table row structure stable.",
        "- Prefer minimal diffs while satisfying plan.",
        "",
        "Return JSON schema:",
        "{",
        '  \"patchedText\": \"string\",',
        '  \"notes\": [\"string\"],',
        '  \"warnings\": [\"string\"]',
        "}",
        "",
        "Plan JSON:",
        JSON.stringify(plan),
        "",
        "Original file:",
        file.content
    ].join("\n");

    const raw = await llmComplete({
        prompt,
        response_format: "json"
    });

    const parsed = safeJsonParse(raw);

    if (!parsed?.patchedText || typeof parsed.patchedText !== "string") {
        throw new Error("refactorTwig: Kernel did not return patchedText string.");
    }

    return {
        mutations: {
            outputs: {
                patches: {
                    patchedText: parsed.patchedText,
                    notes: parsed.notes || [],
                    warnings: parsed.warnings || []
                }
            }
        }
    };
}
