import type { Edge } from "./edge.js";

export function buildAdjacency(edges: Edge[]): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();

  for (const edge of edges) {
    if (!adjacency.has(edge.from)) {
      adjacency.set(edge.from, []);
    }

    adjacency.get(edge.from)?.push(edge.to);
  }

  return adjacency;
}

export function reachableFrom(
  start: string,
  adjacency: Map<string, string[]>
): Set<string> {
  const visited = new Set<string>();
  const stack = [start];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || visited.has(node)) {
      continue;
    }

    visited.add(node);

    const neighbors = adjacency.get(node) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        stack.push(neighbor);
      }
    }
  }

  return visited;
}
