/**
 * Recipe Loader (v2)
 *
 * Loads YAML recipe files and constructs executable step objects.
 * FIXED: Step objects now include ALL YAML fields (patterns, root, include, etc.).
 */

import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { loadPrimitiveStep } from "../steps/loader.js";

export function loadRecipe(recipePath) {
    console.log("[LOADER] Loading recipe from:", recipePath);

    const raw = fs.readFileSync(recipePath, "utf8");
    const data = yaml.load(raw);

    if (!data || !Array.isArray(data.steps)) {
        throw new Error(`Invalid recipe format: missing steps[]`);
    }

    const steps = data.steps.map((step, index) => {
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
            ...step       // <<< absolutely required
        };
    });

    return {
        name: data.name || path.basename(recipePath),
        description: data.description || "",
        params: data.params || {},
        steps
    };
}
