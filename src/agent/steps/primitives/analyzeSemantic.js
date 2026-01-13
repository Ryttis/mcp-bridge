export const analyzeSemantic = {
    run(context) {
        const structure = context.state.structure;
        const semantic = {
            files: {},
            folders: {},
            project: {
                type: "local-agent-runtime",
                characteristics: [
                    "dsl-driven",
                    "pipeline-executor",
                    "local-first"
                ]
            }
        };

        // ── file semantics ──
        for (const [rel, info] of Object.entries(structure.files)) {
            const tags = [];

            switch (info.role) {
                case "engine":
                    tags.push("runtime");
                    break;
                case "step":
                    tags.push("capability");
                    break;
                case "recipe":
                    tags.push("dsl");
                    break;
                case "bridge":
                    tags.push("integration");
                    break;
                case "design":
                    tags.push("design");
                    break;
                case "generated":
                    tags.push("generated");
                    break;
            }

            if (info.isEntryPoint) {
                tags.push("entrypoint");
            }

            semantic.files[rel] = {
                semantic: tags
            };
        }

        // ── folder semantics ──
        semantic.folders = {
            "src/agent/engine": { meaning: "execution-core" },
            "src/agent/steps": { meaning: "capabilities" },
            "src/agent/recipes": { meaning: "dsl-runtime" },
            "src/bridge": { meaning: "integration" },
            "blueprint": { meaning: "design-space" },
            "headers": { meaning: "output" }
        };

        context.state.semantic = semantic;

        context.logs.push(
            `[SEMANTIC] Annotated ${Object.keys(semantic.files).length} files`
        );

        return { ok: true };
    }
};
