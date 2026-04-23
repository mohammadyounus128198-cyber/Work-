import type { Node } from "./parseNodeMap.js";

export function validateGraph(nodes: Node[]): void {
  if (nodes.length === 0) {
    throw new Error("Graph has no nodes");
  }

  const seen = new Set<string>();
  for (const node of nodes) {
    if (seen.has(node.node_id)) {
      throw new Error(`Duplicate node id: ${node.node_id}`);
    }

    seen.add(node.node_id);

    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
      throw new Error(`Invalid coordinates for ${node.node_id}`);
    }

    if (!node.triad) {
      throw new Error(`Missing triad for ${node.node_id}`);
    }
  }

  if (!seen.has("C01")) {
    throw new Error("Missing central node C01");
  }
}
