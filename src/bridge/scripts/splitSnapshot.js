import fs from "fs";
import path from "path";
import url from "url";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../../");

const inFile = path.join(projectRoot, "headers/phr-website-nodejs.json");
const outDir = path.join(projectRoot, "headers/chunks");
const CHUNK_SIZE = 40_000; // ~40 KB per chunk

if (!fs.existsSync(inFile)) {
    console.error("❌ phr-website-nodejs.json does not exist. Run extractSnapshot first.");
    process.exit(1);
}

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

const text = fs.readFileSync(inFile, "utf8");

// Split into chunks
let chunks = [];
for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.slice(i, i + CHUNK_SIZE));
}

// Write chunks
chunks.forEach((chunk, index) => {
    const num = String(index + 1).padStart(3, "0");
    const file = path.join(outDir, `chunk_${num}.json`);
    fs.writeFileSync(file, chunk);
});

console.log("✅ Snapshot split into chunks");
console.log("📁 Directory:", outDir);
console.log("📦 Total chunks:", chunks.length);
console.log("➡️ You can now upload chunks one-by-one into ChatGPT.");
