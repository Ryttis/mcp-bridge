import { scanProject } from "../../scanner/index.js";

export const scan_project = {
    /**
     * Universal Agent step signature:
     * run(context, params)
     */
    run: async (context, params = {}) => {
        console.log("[SCAN] received params:", params);

        const root =
            params.root ||
            context.options?.targetFiles?.[0] ||
            process.cwd();

        console.log("[SCAN] using root:", root);
        const files = await scanProject(root);

        if (!context.state.scan) context.state.scan = {};
        context.state.scan.files = files;
        context.state.scan.root = root;
        context.state.scan.count = files.length;
        context.state.scan.timestamp = new Date().toISOString();

        return {
            ok: true,
            count: files.length,
            root
        };
    }
};
