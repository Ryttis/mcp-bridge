import fs from "fs";
import path from "path";
import url from "url";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../../");

const mdPath = path.join(projectRoot, "headers/latest_phr-website.md");
const jsonPath = path.join(projectRoot, "headers/phr-website-nodejs.json");

try {
    const md = fs.readFileSync(mdPath, "utf8");

    const match = md.match(/```json([\s\S]*?)```/);

    if (!match) {
        console.error("❌ ERROR: No JSON block found in latest_phr-website.md");
        process.exit(1);
    }

    const jsonText = match[1].trim();

    let parsed;
    try {
        parsed = JSON.parse(jsonText);
    } catch (err) {
        console.error("❌ Invalid JSON inside markdown");
        console.error(err);
        process.exit(1);
    }

    fs.writeFileSync(jsonPath, JSON.stringify(parsed, null, 2));

    const stats = fs.statSync(jsonPath);

    console.log("✅ Snapshot JSON extracted");
    console.log("📄 Output:", jsonPath);
    console.log("📏 Size:", stats.size, "bytes");
    console.log("🔑 Keys:", Object.keys(parsed));

} catch (err) {
    console.error("❌ Unexpected error extracting snapshot", err);
    process.exit(1);
}
