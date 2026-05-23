import fs from "node:fs/promises";
import path from "node:path";

import { llmComplete as defaultLlmComplete } from "../kernel/llmClient.js";
import { memoryIngest as defaultMemoryIngest, memoryQuery as defaultMemoryQuery } from "../kernel/memoryClient.js";
import { buildEditPrompt, EDIT_SYSTEM_PROMPT } from "../prompts/editPrompt.js";
import { buildPlanPrompt, PLAN_SYSTEM_PROMPT } from "../prompts/planPrompt.js";
import { scanProject as defaultScanProject } from "../scanner/index.js";
import { parseJsonFromText } from "../utils/jsonFromLLM.js";
import { assertSafeEditablePath, isSafeEditablePath, resolveInsideProject } from "../utils/safePaths.js";

const MAX_READ_BYTES = 512 * 1024;

function timestampForBackup(date = new Date()) {
    const pad = (value) => String(value).padStart(2, "0");
    return [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate())
    ].join("") + "-" + [
        pad(date.getHours()),
        pad(date.getMinutes()),
        pad(date.getSeconds())
    ].join("");
}

function toRelative(projectPath, filePath) {
    return path.relative(projectPath, filePath).replace(/\\/g, "/");
}

function summarizeScan(projectPath, files, maxEntries = 120) {
    const editable = files
        .filter((file) => !file.skipped && !file.isBinary)
        .filter((file) => isSafeEditablePath(projectPath, file.relativePath))
        .slice(0, maxEntries)
        .map((file) => {
            const size = typeof file.size === "number" ? `${file.size}b` : "unknown";
            const lines = typeof file.lineCount === "number" ? `${file.lineCount} lines` : "unknown lines";
            return `- ${file.relativePath} (${file.type || file.extension || "file"}, ${size}, ${lines})`;
        });

    return [
        `Scanned files: ${files.length}`,
        editable.length ? editable.join("\n") : "(no editable text files found)"
    ].join("\n");
}

function normalizeMemoryResult(result) {
    if (!result) return "";
    const entries = Array.isArray(result?.results) ? result.results : Array.isArray(result) ? result : [];
    if (!entries.length) return "";

    return entries.map((entry, index) => {
        if (typeof entry === "string") return `${index + 1}. ${entry}`;
        return `${index + 1}. ${entry.text || entry.content || JSON.stringify(entry)}`;
    }).join("\n");
}

function validatePlan(plan) {
    if (!plan || typeof plan !== "object") {
        throw new Error("Plan response must be a JSON object");
    }

    return {
        summary: typeof plan.summary === "string" ? plan.summary : "",
        filesToRead: Array.isArray(plan.filesToRead) ? plan.filesToRead.filter((file) => typeof file === "string") : [],
        risks: Array.isArray(plan.risks) ? plan.risks : [],
        steps: Array.isArray(plan.steps) ? plan.steps : []
    };
}

function validateEditResponse(response, projectPath, maxFiles) {
    if (!response || typeof response !== "object") {
        throw new Error("Edit response must be a JSON object");
    }

    const edits = Array.isArray(response.edits) ? response.edits : [];
    if (edits.length > maxFiles) {
        throw new Error(`LLM returned too many edits (${edits.length}); maxFiles is ${maxFiles}`);
    }

    const seenPaths = new Set();
    const validated = edits.map((edit) => {
        if (!edit || typeof edit !== "object") {
            throw new Error("Each edit must be an object");
        }
        if (edit.action !== "replace") {
            throw new Error(`Unsupported edit action for ${edit.path || "(unknown path)"}: ${edit.action}`);
        }
        if (typeof edit.content !== "string") {
            throw new Error(`Edit content must be a string for ${edit.path || "(unknown path)"}`);
        }

        const normalizedPath = path.normalize(edit.path).replace(/\\/g, "/");
        if (seenPaths.has(normalizedPath)) {
            throw new Error(`Duplicate edit path rejected: ${normalizedPath}`);
        }
        seenPaths.add(normalizedPath);

        const absPath = assertSafeEditablePath(projectPath, edit.path);
        return {
            path: normalizedPath,
            absPath,
            action: "replace",
            content: edit.content
        };
    });

    return {
        summary: typeof response.summary === "string" ? response.summary : "",
        edits: validated,
        notes: Array.isArray(response.notes) ? response.notes : [],
        testsSuggested: Array.isArray(response.testsSuggested) ? response.testsSuggested : []
    };
}

function errorMessage(err) {
    return err?.message || String(err);
}

async function readTextFile(readFileFn, statFn, absPath) {
    const stat = await statFn(absPath);
    if (stat.size > MAX_READ_BYTES) {
        throw new Error(`File is too large to read safely: ${absPath}`);
    }
    return await readFileFn(absPath, "utf8");
}

async function backupOriginals({ edits, projectPath, mkdirFn, copyFileFn, accessFn, date = new Date() }) {
    if (!edits.length) return null;

    const backupDir = path.join(projectPath, ".mcp_backups", timestampForBackup(date));
    await mkdirFn(backupDir, { recursive: true });

    for (const edit of edits) {
        try {
            await accessFn(edit.absPath);
        } catch {
            continue;
        }

        const backupPath = path.join(backupDir, edit.path);
        await mkdirFn(path.dirname(backupPath), { recursive: true });
        await copyFileFn(edit.absPath, backupPath);
    }

    return backupDir;
}

export async function runAgentEdit({
    request,
    projectPath = process.cwd(),
    dryRun = false,
    useMemory = true,
    maxFiles = 20,
    verbose = false,
    llmCompleteFn = defaultLlmComplete,
    memoryQueryFn = defaultMemoryQuery,
    memoryIngestFn = defaultMemoryIngest,
    scanProjectFn = defaultScanProject,
    readFileFn = fs.readFile,
    writeFileFn = fs.writeFile,
    statFn = fs.stat,
    mkdirFn = fs.mkdir,
    copyFileFn = fs.copyFile,
    accessFn = fs.access,
    date = new Date()
} = {}) {
    if (!request || typeof request !== "string") {
        throw new Error("runAgentEdit: request must be a non-empty string");
    }

    const resolvedProjectPath = path.resolve(projectPath || process.cwd());
    const warnings = [];
    const log = (...args) => {
        if (verbose) console.log("[agent]", ...args);
    };

    log("scanning project", resolvedProjectPath);
    const scannedFiles = await scanProjectFn(resolvedProjectPath);
    const scanSummary = summarizeScan(resolvedProjectPath, scannedFiles);

    let memoryContext = "";
    if (useMemory) {
        try {
            const memoryResult = await memoryQueryFn({
                query: `${request}\nProject: ${path.basename(resolvedProjectPath)}\nPath: ${resolvedProjectPath}`,
                topK: 5
            });
            memoryContext = normalizeMemoryResult(memoryResult);
        } catch (err) {
            warnings.push(`Memory query failed: ${err.message}`);
        }
    }

    log("requesting plan");
    let planText;
    try {
        planText = await llmCompleteFn({
            prompt: buildPlanPrompt({
                request,
                projectPath: resolvedProjectPath,
                scanSummary,
                memoryContext
            }),
            systemPrompt: PLAN_SYSTEM_PROMPT,
            response_format: "json",
            timeoutMs: 130000
        });
    } catch (err) {
        throw new Error(`AI planning failed: ${errorMessage(err)}`);
    }
    const plan = validatePlan(parseJsonFromText(planText));

    const selected = [];
    const seen = new Set();
    for (const filePath of plan.filesToRead) {
        if (selected.length >= maxFiles) break;
        if (seen.has(filePath)) continue;
        seen.add(filePath);

        if (!isSafeEditablePath(resolvedProjectPath, filePath)) {
            warnings.push(`Skipped unsafe plan file: ${filePath}`);
            continue;
        }

        const absPath = resolveInsideProject(resolvedProjectPath, filePath);
        try {
            const content = await readTextFile(readFileFn, statFn, absPath);
            selected.push({ path: toRelative(resolvedProjectPath, absPath), content });
        } catch (err) {
            warnings.push(`Skipped unreadable plan file ${filePath}: ${err.message}`);
        }
    }

    log("requesting edits for", selected.length, "files");
    let editText;
    try {
        editText = await llmCompleteFn({
            prompt: buildEditPrompt({
                request,
                projectPath: resolvedProjectPath,
                scanSummary,
                memoryContext,
                files: selected
            }),
            systemPrompt: EDIT_SYSTEM_PROMPT,
            response_format: "json",
            timeoutMs: 130000
        });
    } catch (err) {
        throw new Error(`AI edit generation failed: ${errorMessage(err)}`);
    }
    const editResponse = validateEditResponse(parseJsonFromText(editText), resolvedProjectPath, maxFiles);

    if (!editResponse.edits.length) {
        return {
            ok: true,
            dryRun,
            projectPath: resolvedProjectPath,
            request,
            planSummary: plan.summary,
            changedFiles: [],
            backupDir: null,
            warnings,
            testsSuggested: editResponse.testsSuggested,
            memoryIngested: false,
            summary: editResponse.summary || plan.summary || "No edits returned."
        };
    }

    let backupDir = null;
    let changedFiles = editResponse.edits.map((edit) => edit.path);

    if (!dryRun) {
        backupDir = await backupOriginals({
            edits: editResponse.edits,
            projectPath: resolvedProjectPath,
            mkdirFn,
            copyFileFn,
            accessFn,
            date
        });

        for (const edit of editResponse.edits) {
            await mkdirFn(path.dirname(edit.absPath), { recursive: true });
            await writeFileFn(edit.absPath, edit.content, "utf8");
        }
    }

    const finalSummary = [
        editResponse.summary || plan.summary || "Agent edit completed.",
        changedFiles.length ? `Changed files: ${changedFiles.join(", ")}` : "Changed files: none",
        dryRun ? "Dry run: no files were written." : `Backup directory: ${backupDir}`
    ].join("\n");

    let memoryIngested = false;
    if (useMemory && !dryRun && changedFiles.length) {
        try {
            await memoryIngestFn({
                text: finalSummary,
                metadata: {
                    project: path.basename(resolvedProjectPath),
                    kind: "agent-edit-summary",
                    source: "mcp-bridge-agent"
                }
            });
            memoryIngested = true;
        } catch (err) {
            warnings.push(`Memory ingest failed: ${err.message}`);
        }
    }

    return {
        ok: true,
        dryRun,
        projectPath: resolvedProjectPath,
        request,
        planSummary: plan.summary,
        changedFiles,
        backupDir,
        warnings,
        testsSuggested: editResponse.testsSuggested,
        memoryIngested,
        summary: finalSummary
    };
}

export default {
    runAgentEdit
};
