/**
 * Recipe Validator (v3)
 *
 * Validates RAW YAML recipe structure.
 * This MUST receive the parsed YAML object.
 */

export function validateRecipe(raw) {
    // 🔍 hard diagnostic (remove later)
    if (raw === undefined) {
        throw new Error("Invalid recipe: validator received undefined");
    }

    if (raw === null) {
        throw new Error("Invalid recipe: validator received null");
    }

    if (typeof raw !== "object" || Array.isArray(raw)) {
        throw new Error(
            `Invalid recipe: not an object (got ${typeof raw})`
        );
    }

    if (!Array.isArray(raw.steps)) {
        throw new Error("Invalid recipe: missing or invalid 'steps' array");
    }

    if (raw.steps.length === 0) {
        throw new Error("Invalid recipe: steps[] cannot be empty");
    }

    raw.steps.forEach((step, index) => {
        if (!step || typeof step !== "object") {
            throw new Error(`Invalid step at index ${index}: not an object`);
        }

        if (!step.type || typeof step.type !== "string") {
            throw new Error(`Invalid step at index ${index}: missing 'type'`);
        }
    });

    return true;
}

// ✅ default export to prevent ESM mismatch bugs
export default validateRecipe;
