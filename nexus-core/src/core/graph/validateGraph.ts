import type { Node } from "./parseNodeMap.js";

export function validateGraph(nodes: Node[]): void {
  const seen = new Set<string>();
  for (const node of nodes) {
    if (seen.has(node.node_id)) {
      throw new Error(`Duplicate node_id: ${node.node_id}`);
    }
    seen.add(node.node_id);

    if (node.weight < 0 || node.weight > 1) {
      throw new Error(`Invalid weight: ${node.node_id}`);
    }

    if (node.x < 0 || node.x > 100 || node.y < 0 || node.y > 100) {
      throw new Error(`Out-of-bounds coordinates: ${node.node_id}`);
    }

    if (node.dormant && node.weight >= 0.8) {
      throw new Error(`Dormant node too strong: ${node.node_id}`);
    }
  }

  if (!nodes.some((node) => node.node_id === "C01")) {
    throw new Error("Missing required central node C01");
  }
}
