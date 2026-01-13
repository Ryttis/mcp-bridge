/**
 * Recipe Loader (v3)
 *
 * Responsibilities:
 * - resolve recipe name or path
 * - load YAML
 * - preserve raw YAML for validation
 * - compile executable steps
 */

import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { loadPrimitiveStep } from "../steps/loader.js";

/**
 * Resolve recipe name or path to an absolute YAML file path.
 *
 * Supported:
 *  - builtin recipe name (e.g. "scan-project")
 *  - explicit path (e.g. "./my-recipe.yaml")
 */
function resolveRecipePath(recipeNameOrPath) {
    // Builtin recipe by name
    if (
        !recipeNameOrPath.includes("/") &&
        !recipeNameOrPath.includes("\\") &&
        !recipeNameOrPath.endsWith(".yaml") &&
        !recipeNameOrPath.endsWith(".yml")
    ) {
        return path.resolve(
            path.dirname(new URL(import.meta.url).pathname),
            "builtin",
            `${recipeNameOrPath}.yaml`
        );
    }

    // Explicit path
    return path.resolve(process.cwd(), recipeNameOrPath);
}

export function loadRecipe(recipeNameOrPath) {
    const recipePath = resolveRecipePath(recipeNameOrPath);

    console.log("[LOADER] Loading recipe from:", recipePath);

    if (!fs.existsSync(recipePath)) {
        throw new Error(`Recipe not found: ${recipePath}`);
    }

    // ─────────────────────────────────────────────
    // 1️⃣ Load + parse raw YAML
    // ─────────────────────────────────────────────
    const rawYaml = fs.readFileSync(recipePath, "utf8");
    const rawData = yaml.load(rawYaml);

    if (!rawData || !Array.isArray(rawData.steps)) {
        throw new Error("Invalid recipe format: missing steps[]");
    }

    // ─────────────────────────────────────────────
    // 2️⃣ Compile executable steps
    // ─────────────────────────────────────────────
    const steps = rawData.steps.map((step, index) => {
        if (!step.type) {
            throw new Error(`Step at index ${index} missing 'type'`);
        }

        const impl = loadPrimitiveStep(step.type);

        if (!impl || typeof impl.run !== "function") {
            throw new Error(`Step type '${step.type}' has no valid run()`);
        }

        return {
            id: step.id || step.type,
            type: step.type,
            run: impl.run,
            ...step // include ALL YAML fields (patterns, root, include, etc.)
        };
    });

    // ─────────────────────────────────────────────
    // 3️⃣ Return compiled recipe + raw YAML
    // ─────────────────────────────────────────────
    return {
        __raw: rawData, // 🔑 used by validator
        name: rawData.name || path.basename(recipePath),
        description: rawData.description || "",
        params: rawData.params || {},
        steps
    };
}
