import type { Edge } from "./edge.js";
import type { Node } from "./parseNodeMap.js";

export function validateEdges(edges: Edge[], nodes: Node[]): void {
  const nodeMap = new Map(nodes.map((n) => [n.node_id, n]));

  for (const edge of edges) {
    const from = nodeMap.get(edge.from);
    const to = nodeMap.get(edge.to);

    if (!from || !to) {
      throw new Error(`Invalid edge: ${edge.from} -> ${edge.to}`);
    }

    if (from.dormant) {
      throw new Error(`Dormant node cannot initiate: ${from.node_id}`);
    }

    if (to.node_id === "C01" && from.node_id === "C01") {
      continue;
    }
  }
}
