import path from "node:path";

import { loadRecipe } from "./recipes/loader.js";
import { validateRecipe } from "./recipes/validator.js";

import { createContext } from "./engine/context.js";
import { buildPipeline } from "./engine/pipeline.js";
import { executePipeline } from "./engine/executor.js";

/**
 * Runs a recipe locally (filesystem access allowed).
 *
 * @param {object} opts
 * @param {string} opts.recipeName
 * @param {string} opts.targetPath
 * @param {object} [opts.params]
 */
export async function runRecipeLocal({ recipeName, targetPath, params = {} }) {
    if (!recipeName) throw new Error("recipeName is required");
    if (!targetPath) throw new Error("targetPath is required");

    const absPath = path.resolve(process.cwd(), targetPath);

    const recipe = await loadRecipe(recipeName);
    validateRecipe(recipe.__raw);


    const context = await createContext({
        recipeName,
        rootPath: absPath,
        params,
        options: {
            verbose: true
        }
    });

    const pipeline = buildPipeline(context, recipe);

    const result = await executePipeline(context, pipeline);

    return {
        ok: true,
        result,
        logs: context.logs,
        errors: context.errors
    };
}
