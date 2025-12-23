import { updateContext } from "./context.js";
import { logStep, logError } from "../logging/logger.js";

const bridgeState = {
    lastContext: null
};

export async function executePipeline(context, pipeline) {

    const steps = pipeline.steps || [];

    for (const step of steps) {
        const id = step.id || step.type || "unknown";

        logStep(context, id, `BEGIN step`);

        try {
            if (typeof step.run !== "function") {
                throw new Error(`Step '${id}' missing run()`);
            }

            const result = await step.run(context, step);

            if (result && result.mutations) {
                updateContext(context, result.mutations);
                logStep(context, id, `APPLIED mutations`);
            }

            logStep(context, id, `END step`);

        } catch (err) {
            const msg = err?.message || String(err);
            logError(context, `Step '${id}' failed: ${msg}`);
            context.errors.push(`STEP FAILED: ${id}`);
            break;
        }
    }

    bridgeState.lastContext = context;

    return context;
}
