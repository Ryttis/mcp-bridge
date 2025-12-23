/**
 * Universal Agent — Pipeline Builder (v1)
 */

import { loadPrimitiveStep } from "../steps/loader.js";
import { logInfo } from "../logging/logger.js";

/**
 * Build the pipeline from a recipe object.
 */
export function buildPipeline(context, recipe, runtimeParams = {}) {
    if (!recipe || !Array.isArray(recipe.steps)) {
        throw new Error("Invalid recipe: missing steps[]");
    }

    logInfo(context, `Building pipeline for recipe '${recipe.name}'`);

    const steps = [];

    for (const stepDef of recipe.steps) {

        const id = stepDef.id || stepDef.type;

        const stepImpl = loadPrimitiveStep(id);

        const step = {
            id,
            type: stepDef.type,
            config: stepDef,

            run: async (ctx, passedParams = {}) => {
                const mergedParams = {
                    ...(stepDef.params || {}),
                    ...runtimeParams,
                    ...passedParams
                };

                return await stepImpl.run(ctx, stepDef, mergedParams);
            }
        };

        steps.push(step);
    }

    logInfo(context, `Pipeline assembled with ${steps.length} steps`);

    return {
        steps,
        params: runtimeParams
    };
}
