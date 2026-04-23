import { readFileSync } from "node:fs";

export type Node = {
  node_id: string;
  x: number;
  y: number;
  triad: string;
  dormant: boolean;
};

export function parseNodeMap(path: string): Node[] {
  const raw = readFileSync(path, "utf-8").trim();
  const lines = raw.split(/\r?\n/);

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(",");
  const index = new Map(headers.map((h, i) => [h.trim(), i]));

  const get = (row: string[], key: string): string => {
    const idx = index.get(key);
    if (idx === undefined || idx >= row.length) {
      throw new Error(`Missing column '${key}' in node map`);
    }

    return row[idx].trim();
  };

  return lines.slice(1).map((line) => {
    const row = line.split(",");

    return {
      node_id: get(row, "node_id"),
      x: Number(get(row, "x")),
      y: Number(get(row, "y")),
      triad: get(row, "triad"),
      dormant: get(row, "dormant").toLowerCase() === "true"
    };
  });
}
