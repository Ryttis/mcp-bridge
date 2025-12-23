/**
 * AI Step: docHeaderTransform (v1)
 *
 * Uses OpenAI to add a single JSDoc header at the top of the file.
 * Strict instruction: do NOT change any logic.
 */

import OpenAI from "openai";
import { logStep, logError } from "../../logging/logger.js";

function getClient() {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
        throw new Error("OPENAI_API_KEY is missing");
    }
    return new OpenAI({ apiKey: key });
}

export async function run(context) {
    const originals = context.filesContent;
    const outputs = {};
    const targetFiles = context.selectedFiles;

    if (!targetFiles || targetFiles.length === 0) {
        logError(context, "docHeaderTransform: No selected files.");
        return {};
    }

    logStep(context, "docHeaderTransform", `Requesting AI transformation for ${targetFiles.length} file(s)`);

    for (const file of targetFiles) {
        const content = originals[file];

        if (!content) {
            logError(context, `docHeaderTransform: Missing file content for ${file}`);
            continue;
        }

        try {
            const client = getClient();

            const completion = await client.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content:
                            "You are a documentation assistant.\n" +
                            "Add exactly ONE concise JSDoc header at the top of the file.\n" +
                            "Describe purpose, parameters, and return value.\n" +
                            "Output ONLY valid JavaScript.\n" +
                            "ABSOLUTELY DO NOT MODIFY LOGIC."
                    },
                    {
                        role: "user",
                        content: content
                    }
                ]
            });

            const improved = completion.choices?.[0]?.message?.content?.trim();

            if (!improved) {
                logError(context, `AI returned empty output for ${file}`);
                continue;
            }

            outputs[file] = improved;

        } catch (err) {
            logError(context, `OpenAI error for '${file}': ${err?.message || err}`);
        }
    }

    return {
        mutations: {
            aiOutputs: outputs
        }
    };
}
