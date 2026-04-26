import fs from "node:fs";
import path from "node:path";
import type { FullAnalysis } from "./pipeline.js";
import { sha256Hex, stableStringify } from "./hash.js";

/**
 * Writes the given analysis as pretty-printed JSON to the specified file.
 *
 * @param analysis - The analysis data to serialize
 * @param outputPath - Destination file path for the JSON (default: "./analysis.json")
 */

/**
 * Serializes the analysis deterministically, writes it to a file, writes a SHA-256 checksum file alongside it, and returns the produced paths and hash.
 *
 * @param analysis - The analysis data to serialize
 * @param outputPath - Destination file path for the serialized analysis (default: "./analysis.json")
 * @returns An object containing `outputPath`, the checksum file path as `hashPath`, and the SHA-256 `hash`
 */
export function exportAnalysis(analysis: FullAnalysis, outputPath = "./analysis.json"): void {
  const payload = `${JSON.stringify(analysis, null, 2)}\n`;
  fs.writeFileSync(outputPath, payload, "utf8");
export type ExportResult = {
  outputPath: string;
  hashPath: string;
  hash: string;
};

export function exportAnalysis(analysis: FullAnalysis, outputPath = "./analysis.json"): ExportResult {
  const serialized = stableStringify(analysis);
  fs.writeFileSync(outputPath, `${serialized}\n`);

  const hash = sha256Hex(`${serialized}\n`);
  const hashPath = `${outputPath}.sha256`;
  const fileName = path.basename(outputPath);
  fs.writeFileSync(hashPath, `${hash}  ${fileName}\n`);

  return { outputPath, hashPath, hash };
}
