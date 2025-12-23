/**
 * Universal Agent — Step Loader (v2)
 *
 * Loads ALL step categories:
 *  - primitives
 *  - ai
 *  - scanner
 *
 * And normalizes different export styles:
 *  - module with named export:   { run() { … } }
 *  - module with default object: { default: { run() { … } } }
 */

import * as primitives from "./primitives/index.js";
import * as ai from "./ai/index.js";
import * as scanner from "./scanner/index.js";

/**
 * Normalize whatever we got into an object that has a .run() function.
 */
function normalizeStep(id, candidate) {
    if (!candidate) return null;

    // Case 1: module namespace with named export `run`
    if (typeof candidate.run === "function") {
        return candidate;
    }

    // Case 2: module namespace with default object that has `run`
    if (
        candidate.default &&
        typeof candidate.default.run === "function"
    ) {
        return candidate.default;
    }

    return null;
}

/**
 * Returns a step implementation by ID:
 * @param {string} id
 * @returns {{ run: Function }} step implementation
 */
export function loadPrimitiveStep(id) {
    const rawCandidate =
        primitives[id] ||
        ai[id] ||
        scanner[id];

    const impl = normalizeStep(id, rawCandidate);

    if (!impl) {
        throw new Error(`Step type '${id}' has no valid run()`);
    }

    return impl;
}
