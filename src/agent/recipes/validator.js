/**
 * Recipe Validator (v1)
 *
 * Ensures recipe has:
 * - name (string)
 * - steps (array)
 * - each step has: { id: string }
 */

import { logError, logStep } from "../logging/logger.js";
import { loadPrimitiveStep } from "../steps/loader.js";

export function validateRecipe(context, recipe) {
    if (!recipe || typeof recipe !== "object") {
        throw new Error("Invalid recipe: not an object");
    }

    if (!recipe.name || typeof recipe.name !== "string") {
        throw new Error("Invalid recipe: missing 'name'");
    }

    if (!Array.isArray(recipe.steps)) {
        throw new Error("Invalid recipe: 'steps' must be an array");
    }

    logStep(context, "recipe", `Validating recipe '${recipe.name}'`);

    for (const step of recipe.steps) {
        if (typeof step !== "object" || !step.id) {
            throw new Error(`Invalid recipe step: ${JSON.stringify(step)}`);
        }

        try {
            // Will throw if unknown
            loadPrimitiveStep(step.id);
        } catch (err) {
            logError(context, `Recipe step '${step.id}' is invalid: ${err.message}`);
            throw err;
        }
    }

    return true;
}
