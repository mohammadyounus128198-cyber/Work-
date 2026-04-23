import type { Edge } from "./edge.js";
import type { Node } from "./parseNodeMap.js";

const MAX_DISTANCE = 20;

function distance(a: Node, b: Node): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function generateEdges(nodes: Node[]): Edge[] {
  const edges: Edge[] = [];

  for (const a of nodes) {
    if (a.dormant) {
      continue;
    }

    for (const b of nodes) {
      if (a.node_id === b.node_id) {
        continue;
      }

      if (a.triad === b.triad) {
        edges.push({ from: a.node_id, to: b.node_id });
        continue;
      }

      if (distance(a, b) <= MAX_DISTANCE) {
        edges.push({ from: a.node_id, to: b.node_id });
      }
    }
  }

  return edges;
}
