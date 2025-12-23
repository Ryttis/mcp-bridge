/**
 * Universal Agent — Logging Formatter (v1)
 *
 * Responsible for shaping log entries into consistent, timestamped strings.
 * The logger.js module will handle writing these logs to files and console.
 */

/**
 * Return an ISO timestamp.
 * @returns {string}
 */
export function ts() {
    return new Date().toISOString();
}

/**
 * Format an info-level log entry.
 * @param {string} message
 * @returns {string}
 */
export function formatInfo(message) {
    return `[${ts()}] [INFO] ${message}`;
}

/**
 * Format a step-level log entry.
 * @param {string} stepId
 * @param {string} message
 * @returns {string}
 */
export function formatStep(stepId, message) {
    return `[${ts()}] [STEP:${stepId}] ${message}`;
}

/**
 * Format an error-level log entry.
 * @param {string} message
 * @returns {string}
 */
export function formatError(message) {
    return `[${ts()}] [ERROR] ${message}`;
}
