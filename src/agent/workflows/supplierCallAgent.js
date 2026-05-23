import fs from "node:fs/promises";
import path from "node:path";

import { validateCampaign } from "../supplier/campaignSchema.js";
import { buildLithuanianScript } from "../supplier/scriptBuilder.js";

export async function loadSupplierCampaign(inputPath, cwd = process.cwd()) {
    if (!inputPath || typeof inputPath !== "string") {
        throw new Error("--input is required");
    }

    const resolvedPath = path.resolve(cwd, inputPath);
    const raw = await fs.readFile(resolvedPath, "utf8");

    try {
        return JSON.parse(raw);
    } catch (err) {
        throw new Error(`Invalid campaign JSON: ${err.message}`);
    }
}

export async function runSupplierCallAgent(options = {}) {
    const {
        inputPath,
        dryRun = false,
        cwd = process.cwd(),
        maxSellers,
        callProvider
    } = options;

    if (!dryRun) {
        throw new Error("supplier-call currently supports --dry-run only");
    }

    if (callProvider) {
        // Kept intentionally unused in dry-run mode so tests can prove no provider is invoked.
    }

    const rawCampaign = await loadSupplierCampaign(inputPath, cwd);
    const campaign = validateCampaign(rawCampaign, { maxSellers });
    const callScript = buildLithuanianScript(campaign);

    const plannedCalls = campaign.sellers.map((seller) => ({
        sellerName: seller.name,
        phone: seller.phone,
        status: "planned",
        script: callScript,
        questions: callScript.questions
    }));

    return {
        ok: true,
        dryRun: true,
        requiresApproval: true,
        campaignId: campaign.campaignId,
        language: campaign.language,
        sellerCount: campaign.sellers.length,
        partCount: campaign.parts.length,
        callScript,
        plannedCalls,
        resultTemplate: {
            sellerName: "",
            phone: "",
            reached: false,
            availableParts: [],
            price: null,
            condition: "",
            pickupAddress: "",
            workingHours: "",
            reservationPossible: null,
            notes: ""
        },
        warnings: []
    };
}
