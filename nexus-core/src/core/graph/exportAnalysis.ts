import { writeFileSync } from "node:fs";
import type { Analysis } from "./pipeline.js";

export function exportAnalysis(analysis: Analysis, filePath = "./analysis.json"): void {
  writeFileSync(filePath, JSON.stringify(analysis, null, 2));
}
