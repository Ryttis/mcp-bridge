export const analyzeIntent = {
    run(context) {
        const intent = {
            project: {
                primaryIntent: "local agent execution framework",
                secondaryIntents: [
                    "project inspection",
                    "deterministic analysis",
                    "kernel-assisted orchestration"
                ],
                nonGoals: [
                    "web application",
                    "long-running daemon"
                ]
            },
            folders: {
                "src/agent": "runtime execution core",
                "src/bridge": "integration and orchestration",
                "src/agent/recipes": "execution DSL",
                "blueprint": "design and planning space",
                "headers": "generated project snapshots"
            }
        };

        context.state.intent = intent;

        context.logs.push("[INTENT] Project intent annotated");

        return { ok: true };
    }
};
