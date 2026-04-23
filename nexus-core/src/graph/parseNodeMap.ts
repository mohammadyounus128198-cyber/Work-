import fs from "node:fs";
import path from "node:path";

export type Guardian =
  | "Phoenix"
  | "Dragon"
  | "Lion"
  | "Raven"
  | "Butterfly"
  | "Ouroboros";

export type NodeType = "central" | "cluster" | "generic";

export type Node = {
  id: number;
  node_id: string;
  x: number;
  y: number;
  label: string;
  number: number;
  weight: number;
  guardian: Guardian;
  triad: string;
  hexagram: string;
  type: NodeType;
  dormant: boolean;
};

function parseBool(value: string): boolean {
  return value.trim().toLowerCase() === "true";
}

function parseNumber(value: string, field: string, nodeId: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number in ${field} for ${nodeId || "<unknown>"}`);
  }
  return parsed;
}

export function parseNodeMap(csvPath: string): Node[] {
  const raw = fs.readFileSync(path.resolve(csvPath), "utf-8");
  const lines = raw.trim().split(/\r?\n/);

  if (lines.length < 2) {
    throw new Error("CSV is empty or missing data rows");
  }

  const headers = lines[0].split(",").map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const record: Record<string, string> = {};

    headers.forEach((header, i) => {
      record[header] = (values[i] ?? "").trim();
    });

    const nodeId = record.node_id ?? "";

    return {
      id: parseNumber(record.id, "id", nodeId),
      node_id: nodeId,
      x: parseNumber(record.x, "x", nodeId),
      y: parseNumber(record.y, "y", nodeId),
      label: record.label,
      number: parseNumber(record.number, "number", nodeId),
      weight: parseNumber(record.weight, "weight", nodeId),
      guardian: record.guardian as Guardian,
      triad: record.triad,
      hexagram: record.hexagram,
      type: record.type as NodeType,
      dormant: parseBool(record.dormant),
    };
  });
}
