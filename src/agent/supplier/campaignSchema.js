import { randomUUID } from "node:crypto";

import { buildPartPickList } from "./pickList.js";
import { validateLithuanianE164Phone } from "./phoneValidation.js";

const DEFAULT_MAX_SELLERS = 10;

function requireText(value, field) {
    if (typeof value !== "string" || value.trim() === "") {
        throw new Error(`${field} is required`);
    }

    return value.trim();
}

function requireYear(value) {
    if (!Number.isInteger(value) || value < 1886) {
        throw new Error("car.year is required");
    }

    return value;
}

function normalizeSellers(sellers, maxSellers) {
    if (!Array.isArray(sellers) || sellers.length === 0) {
        throw new Error("At least one seller is required");
    }

    if (sellers.length > maxSellers) {
        throw new Error(`At most ${maxSellers} sellers are allowed`);
    }

    return sellers.map((seller, index) => {
        if (!seller || typeof seller !== "object") {
            throw new Error(`sellers[${index}] must be an object`);
        }

        return {
            name: typeof seller.name === "string" && seller.name.trim() ? seller.name.trim() : `Seller ${index + 1}`,
            phone: validateLithuanianE164Phone(seller.phone, `sellers[${index}].phone`),
            source: typeof seller.source === "string" ? seller.source.trim() : ""
        };
    });
}

export function validateCampaign(campaign, options = {}) {
    const maxSellers = options.maxSellers ?? DEFAULT_MAX_SELLERS;

    if (!campaign || typeof campaign !== "object" || Array.isArray(campaign)) {
        throw new Error("Campaign must be a JSON object");
    }

    if (campaign.language !== "lt-LT") {
        throw new Error('language must be "lt-LT"');
    }

    if (!campaign.car || typeof campaign.car !== "object") {
        throw new Error("car is required");
    }

    const normalized = {
        campaignId: typeof campaign.campaignId === "string" && campaign.campaignId.trim()
            ? campaign.campaignId.trim()
            : randomUUID(),
        language: "lt-LT",
        callerName: requireText(campaign.callerName, "callerName"),
        car: {
            make: requireText(campaign.car.make, "car.make"),
            model: requireText(campaign.car.model, "car.model"),
            year: requireYear(campaign.car.year),
            engine: typeof campaign.car.engine === "string" ? campaign.car.engine.trim() : "",
            vin: typeof campaign.car.vin === "string" ? campaign.car.vin.trim() : ""
        },
        parts: buildPartPickList(campaign.parts),
        sellers: normalizeSellers(campaign.sellers, maxSellers),
        constraints: campaign.constraints && typeof campaign.constraints === "object" ? { ...campaign.constraints } : {}
    };

    return normalized;
}
