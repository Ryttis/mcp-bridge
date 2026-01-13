/**
 * Universal Agent — Step Loader (v3)
 *
 * Loads ALL step categories:
 *  - primitives
 *  - ai
 *  - scanner
 *
 * Supports ALL real-world export styles:
 *  - named export with run():        export const foo = { run() {} }
 *  - default export with run():      export default { run() {} }
 *  - default export MAP of steps:    export default { "foo-bar": { run() {} } }
 */

import * as primitives from "./primitives/index.js";
import * as ai from "./ai/index.js";
import * as scanner from "./scanner/index.js";

/**
 * Normalize whatever we got into an object that has a .run() function.
 *
 * @param {string} id
 * @param {*} candidate
 * @returns {{ run: Function } | null}
 */
function normalizeStep(id, candidate) {
    if (!candidate) return null;

    // Case 1: direct object with run()
    if (typeof candidate.run === "function") {
        return candidate;
    }

    // Case 2: module namespace with default export having run()
    if (
        candidate.default &&
        typeof candidate.default.run === "function"
    ) {
        return candidate.default;
    }

    return null;
}

/**
 * Resolve a step implementation by type ID.
 *
 * @param {string} id
 * @returns {{ run: Function }}
 */
export function loadPrimitiveStep(id) {
    const rawCandidate =
        // primitives
        primitives[id] ||

        // ai
        ai[id] ||

        // scanner (named export)
        scanner[id] ||

        // scanner (default-exported map)
        scanner.default?.[id] ||   // 🔑 critical fix

        null;

    const impl = normalizeStep(id, rawCandidate);

    if (!impl) {
        throw new Error(`Step type '${id}' has no valid run()`);
    }

    return impl;
}
