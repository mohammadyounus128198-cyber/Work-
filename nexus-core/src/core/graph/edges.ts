import type { Node } from "./parseNodeMap.js";

export type Edge = {
  from: string;
  to: string;
};

function distance(a: Node, b: Node): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function generateEdges(nodes: Node[]): Edge[] {
  const activeNodes = nodes
    .filter((node) => !node.dormant)
    .sort((left, right) => left.node_id.localeCompare(right.node_id));

  const edges: Edge[] = [];

  for (let index = 0; index < activeNodes.length; index += 1) {
    const node = activeNodes[index];
    const ringNeighbor = activeNodes[(index + 1) % activeNodes.length];

    if (ringNeighbor && ringNeighbor.node_id !== node.node_id) {
      edges.push({ from: node.node_id, to: ringNeighbor.node_id });
    }

    const strongestNeighbor = activeNodes
      .filter((candidate) => candidate.node_id !== node.node_id)
      .sort((left, right) => {
        const weightDelta = right.weight - left.weight;
        if (weightDelta !== 0) {
          return weightDelta;
        }

        const leftDistance = distance(node, left);
        const rightDistance = distance(node, right);
        if (leftDistance !== rightDistance) {
          return leftDistance - rightDistance;
        }

        return left.node_id.localeCompare(right.node_id);
      })[0];

    if (strongestNeighbor && strongestNeighbor.node_id !== ringNeighbor?.node_id) {
      edges.push({ from: node.node_id, to: strongestNeighbor.node_id });
    }
  }

  return edges;
}

export function validateEdges(edges: Edge[], nodes: Node[]): void {
  const nodeIds = new Set(nodes.map((node) => node.node_id));
  const dormantIds = new Set(
    nodes.filter((node) => node.dormant).map((node) => node.node_id)
  );

  for (const edge of edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      throw new Error(`Edge references unknown node: ${edge.from} -> ${edge.to}`);
    }

    if (dormantIds.has(edge.to)) {
      throw new Error(`Dormant node is reachable: ${edge.to}`);
    }

    if (edge.from === edge.to) {
      throw new Error(`Self-loop edge not allowed: ${edge.from}`);
    }
  }
}

export function buildAdjacency(edges: Edge[]): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const existing = adjacency.get(edge.from) ?? [];
    adjacency.set(edge.from, [...existing, edge.to]);
  }
  return adjacency;
}
