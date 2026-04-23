import { describe, expect, test } from "vitest";
import type { Node } from "../../src/core/graph/parseNodeMap.js";
import { simulate } from "../../src/core/graph/simulate.js";

describe("simulate", () => {
  test("system reaches stable attractor from central node", () => {
    const nodes: Node[] = [
      { node_id: "C01", x: 50, y: 50, weight: 0.95, dormant: false },
      { node_id: "C02", x: 60, y: 50, weight: 0.9, dormant: false },
      { node_id: "C03", x: 70, y: 50, weight: 0.9, dormant: false },
      { node_id: "C04", x: 80, y: 50, weight: 0.9, dormant: false },
      { node_id: "C05", x: 90, y: 50, weight: 0.9, dormant: false }
    ];

    const adj = new Map<string, string[]>([
      ["C01", ["C02"]],
      ["C02", ["C03"]],
      ["C03", ["C04"]],
      ["C04", ["C05"]],
      ["C05", ["C01"]]
    ]);

    const nodeMap = new Map(nodes.map((node) => [node.node_id, node]));
    const result = simulate("C01", adj, nodeMap);

    expect(result.type).toBe("ATTRACTOR");
    expect(result.steps).toBeGreaterThan(0);
    expect(result.stability).toBeGreaterThan(0);
  });
});
