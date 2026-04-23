import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { parseNodeMap } from "../../src/core/parseNodeMap.js";
import { exportAnalysis } from "../../src/core/graph/exportAnalysis.js";
import { runFullAnalysis } from "../../src/core/graph/pipeline.js";
import { stableStringify } from "../../src/core/graph/stableStringify.js";

describe("analysis export determinism", () => {
  test("analysis output is deterministic", () => {
    const nodes = parseNodeMap("./data/node_map.csv");
    const a1 = stableStringify(runFullAnalysis(nodes));
    const a2 = stableStringify(runFullAnalysis(nodes));

    expect(a1).toBe(a2);
  });

  test("export writes a matching sha256 checksum file", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-core-"));
    const outputPath = path.join(tempDir, "analysis.json");
    const nodes = parseNodeMap("./data/node_map.csv");
    const analysis = runFullAnalysis(nodes);

    const hash = exportAnalysis(analysis, outputPath);
    const json = fs.readFileSync(outputPath, "utf8");
    const checksum = fs.readFileSync(path.join(tempDir, "analysis.sha256"), "utf8");

    expect(checksum).toBe(`${hash}  analysis.json\n`);
    expect(stableStringify(analysis)).toBe(json);
  });
});