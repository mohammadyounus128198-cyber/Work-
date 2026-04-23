import fs from "node:fs";
import { sha256 } from "./hash.js";
import { stableStringify } from "./stableStringify.js";
export function exportAnalysis(analysis, outputPath = "./analysis.json") {
    const json = stableStringify(analysis);
    const hash = sha256(json);
    const hashPath = outputPath.endsWith(".json")
        ? `${outputPath.slice(0, -".json".length)}.sha256`
        : `${outputPath}.sha256`;
    const fileName = outputPath.split("/").at(-1) ?? "analysis.json";
    fs.writeFileSync(outputPath, json);
    fs.writeFileSync(hashPath, `${hash}  ${fileName}\n`);
    console.log("✔ analysis.json written");
    console.log("🔒 SHA-256:", hash);
    return hash;
}