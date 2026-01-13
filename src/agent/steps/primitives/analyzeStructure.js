import path from "path";

export const analyzeStructure = {
    run(context) {
        const files = context.state.scan?.files || [];

        const structure = {
            files: {},
            modules: {}
        };

        for (const file of files) {
            const rel = file.relativePath;

            let role = "other";

            if (rel === "bridge.js") role = "entrypoint";
            else if (rel.startsWith("src/agent/engine/")) role = "engine";
            else if (rel.startsWith("src/agent/steps/")) role = "step";
            else if (rel.startsWith("src/agent/recipes/")) role = "recipe";
            else if (rel.startsWith("src/bridge/")) role = "bridge";
            else if (rel.startsWith("blueprint/")) role = "design";
            else if (rel.startsWith("headers/")) role = "generated";

            const isEntryPoint =
                role === "entrypoint" ||
                (rel.endsWith("/index.js") && rel.split("/").length <= 3);

            structure.files[rel] = {
                role,
                isEntryPoint
            };

            if (rel.startsWith("src/")) {
                const parts = rel.split("/");
                if (parts.length >= 3) {
                    const moduleKey = `${parts[1]}/${parts[2]}`;

                    if (!structure.modules[moduleKey]) {
                        structure.modules[moduleKey] = {
                            fileCount: 0,
                            lineCount: 0
                        };
                    }

                    structure.modules[moduleKey].fileCount += 1;
                    structure.modules[moduleKey].lineCount += file.lineCount || 0;
                }
            }
        }

        context.state.structure = structure;

        context.logs.push(
            `[STRUCTURE] Analyzed ${Object.keys(structure.files).length} files`
        );

        return {
            ok: true,
            modules: Object.keys(structure.modules).length
        };
    }
};
