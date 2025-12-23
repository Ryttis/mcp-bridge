import { loadRecipe } from "../../agent/recipes/loader.js";
import { validateRecipe } from "../../agent/recipes/validator.js";
import { createContext } from "../../agent/engine/context.js";
import { buildPipeline } from "../../agent/engine/pipeline.js";
import { executePipeline } from "../../agent/engine/executor.js";
import { callMCP } from "../../agent/integration/mcp.js";
import path from "path";
import fs from "fs";

export async function runRecipe(recipeName, targetPath, options = {}) {
    const rootPath = process.cwd();
    const absPath = targetPath ? path.resolve(targetPath) : rootPath;

    const context = createContext({
        verbose: true,
        rootPath,
        targetFiles: [absPath],
        ...options,
        startedAt: new Date().toISOString()
    });

    const builtinPath = path.join(
        rootPath,
        "src/agent/recipes/builtin",
        `${recipeName}.yaml`
    );
    const projectPath = path.join(
        rootPath,
        ".ai/recipes",
        `${recipeName}.yaml`
    );

    let recipeFile = null;

    if (fs.existsSync(projectPath)) recipeFile = projectPath;
    else if (fs.existsSync(builtinPath)) recipeFile = builtinPath;
    else throw new Error(`Recipe '${recipeName}' not found.`);

    const recipe = loadRecipe(recipeFile);

    validateRecipe(context, recipe);

    const pipeline = buildPipeline(context, recipe, { root: absPath });

    await executePipeline(context, pipeline, { root: absPath });

    context.finishedAt = new Date().toISOString();

    try {
        console.log("[BRIDGE] Sending lastContext to server via core_setLastContext...");
        const result = await callMCP("core_setLastContext", { context });
        console.log("[BRIDGE] core_setLastContext result:", result);
    } catch (err) {
        console.error("[BRIDGE] Failed to sync lastContext to server:", err);
    }

    console.log("✔️ Recipe completed.");
    return context;
}
