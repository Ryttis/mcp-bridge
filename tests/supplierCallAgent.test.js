import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { runSupplierCallAgent } from "../src/agent/workflows/supplierCallAgent.js";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function validCampaign(overrides = {}) {
    return {
        language: "lt-LT",
        callerName: "Rytis",
        car: {
            make: "BMW",
            model: "3 Series",
            year: 2012,
            engine: "2.0 diesel",
            vin: ""
        },
        parts: [
            {
                name: "front left headlight",
                notes: "xenon, adaptive if available"
            }
        ],
        sellers: [
            {
                name: "Seller 1",
                phone: "+37060000000",
                source: "manual"
            }
        ],
        constraints: {
            cityPreference: "Vilnius",
            maxPrice: null,
            pickupOnly: true
        },
        ...overrides
    };
}

async function writeCampaign(campaign) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "supplier-call-test-"));
    const file = path.join(dir, "campaign.json");
    await fs.writeFile(file, JSON.stringify(campaign, null, 2), "utf8");
    return file;
}

test("valid campaign returns ok true", async () => {
    const inputPath = await writeCampaign(validCampaign());

    const result = await runSupplierCallAgent({ inputPath, dryRun: true });

    assert.equal(result.ok, true);
    assert.equal(result.dryRun, true);
    assert.equal(result.requiresApproval, true);
    assert.equal(result.sellerCount, 1);
    assert.equal(result.partCount, 1);
});

test("Lithuanian script includes car and part details", async () => {
    const inputPath = await writeCampaign(validCampaign());

    const result = await runSupplierCallAgent({ inputPath, dryRun: true });
    const scriptText = [
        result.callScript.intro,
        ...result.callScript.questions,
        result.callScript.closing
    ].join("\n");

    assert.match(scriptText, /Rytis/);
    assert.match(scriptText, /2012 BMW 3 Series/);
    assert.match(scriptText, /2\.0 diesel/);
    assert.match(scriptText, /priekinį kairės pusės žibintą/);
    assert.match(scriptText, /xenon, adaptive if available/);
    assert.match(scriptText, /kaina/i);
    assert.match(scriptText, /būklė/i);
    assert.match(scriptText, /darbo valandos/i);
});

test("script includes Lithuanian characters", async () => {
    const inputPath = await writeCampaign(validCampaign());

    const result = await runSupplierCallAgent({ inputPath, dryRun: true });
    const scriptText = JSON.stringify(result.callScript);

    for (const word of ["dėl", "šią", "detalės", "būtų", "būklė", "įbrėžimų", "lūžimų", "atsiėmimo", "jūsų", "šiandien", "gražios"]) {
        assert.match(scriptText.toLowerCase(), new RegExp(word));
    }
});

test("known parts are translated and per-part questions are structured", async () => {
    const inputPath = await writeCampaign(validCampaign({
        parts: [
            { name: "front left headlight", notes: "xenon, adaptive if available" },
            { name: "front bumper", notes: "black preferred" }
        ]
    }));

    const result = await runSupplierCallAgent({ inputPath, dryRun: true });

    assert.ok(Array.isArray(result.callScript.perPartQuestions));
    assert.equal(result.callScript.perPartQuestions.length, 2);
    assert.equal(result.callScript.perPartQuestions[0].partName, "front left headlight");
    assert.equal(result.callScript.perPartQuestions[0].spokenPartName, "priekinį kairės pusės žibintą");
    assert.equal(result.callScript.perPartQuestions[1].partName, "front bumper");
    assert.equal(result.callScript.perPartQuestions[1].spokenPartName, "priekinį bamperį");
    assert.match(result.callScript.perPartQuestions[0].questions[0], /Ar turite šią detalę/);
    assert.match(result.callScript.generalQuestions.join("\n"), /Vilniuje arba netoli Vilniaus/);
});

test("flattened questions remain available for compatibility", async () => {
    const inputPath = await writeCampaign(validCampaign());

    const result = await runSupplierCallAgent({ inputPath, dryRun: true });

    assert.ok(Array.isArray(result.callScript.questions));
    assert.ok(result.callScript.questions.length > 0);
    assert.deepEqual(result.plannedCalls[0].questions, result.callScript.questions);
});

test("invalid phone is rejected", async () => {
    const inputPath = await writeCampaign(validCampaign({
        sellers: [{ name: "Bad Seller", phone: "+37160000000", source: "manual" }]
    }));

    await assert.rejects(
        runSupplierCallAgent({ inputPath, dryRun: true }),
        /E\.164 Lithuanian number/
    );
});

test("empty sellers rejected", async () => {
    const inputPath = await writeCampaign(validCampaign({ sellers: [] }));

    await assert.rejects(
        runSupplierCallAgent({ inputPath, dryRun: true }),
        /At least one seller/
    );
});

test("more than 10 sellers rejected", async () => {
    const sellers = Array.from({ length: 11 }, (_, index) => ({
        name: `Seller ${index + 1}`,
        phone: `+370600000${index}`.slice(0, 12),
        source: "manual"
    }));
    const inputPath = await writeCampaign(validCampaign({ sellers }));

    await assert.rejects(
        runSupplierCallAgent({ inputPath, dryRun: true }),
        /At most 10 sellers/
    );
});

test("--json output is parseable", async () => {
    const { stdout, stderr } = await execFileAsync(
        process.execPath,
        ["bridge.js", "supplier-call", "--input", "./examples/supplier-campaign.example.json", "--json", "--dry-run"],
        { cwd: repoRoot }
    );

    assert.equal(stderr, "");
    const result = JSON.parse(stdout);
    assert.equal(result.ok, true);
    assert.equal(result.dryRun, true);
});

test("no real call provider is invoked", async () => {
    const inputPath = await writeCampaign(validCampaign());
    let invoked = false;

    const result = await runSupplierCallAgent({
        inputPath,
        dryRun: true,
        callProvider: async () => {
            invoked = true;
        }
    });

    assert.equal(result.ok, true);
    assert.equal(invoked, false);
});
