import test from "node:test";
import assert from "node:assert/strict";

import { loadRecipe } from "../src/agent/recipes/loader.js";
import { validateRecipe } from "../src/agent/recipes/validator.js";

for (const recipeName of ["scan-project", "doc-header", "collect-files"]) {
    test(`${recipeName} validates and compiles`, () => {
        const recipe = loadRecipe(recipeName);

        assert.equal(validateRecipe(recipe.__raw), true);
        assert.ok(recipe.steps.length > 0);

        for (const step of recipe.steps) {
            assert.equal(typeof step.type, "string");
            assert.equal(typeof step.run, "function");
        }
    });
}
