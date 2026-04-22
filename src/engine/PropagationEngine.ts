import { influence } from "../core/faults.js";
import type { CoherenceState } from "../core/types.js";
import type { EdgeMap } from "../topology/edges.js";
import type { NodeMap } from "../topology/nodes.js";
import type { WeightMap } from "../topology/weights.js";

export function normalizedInfluence(neighbors: CoherenceState[]): number[] {
  const values = neighbors.map(influence);
  const total = values.reduce((sum, value) => sum + value, 0);

  if (total === 0) {
    return values.map(() => 0);
  }

  return values.map((value) => value / total);
}

export function externalPressureForNode(
  id: string,
  nodes: NodeMap,
  edges: EdgeMap,
  weights: WeightMap
): number {
  const neighbors = edges[id] ?? [];
  const neighborStates = neighbors
    .map((neighborId) => nodes[neighborId])
    .filter((value): value is CoherenceState => Boolean(value));
  const normalized = normalizedInfluence(neighborStates);

  return neighborStates.reduce((sum, neighbor, index) => {
    const weight = weights[id]?.[neighbor.id] ?? 0;
    return sum + weight * normalized[index] * influence(neighbor);
  }, 0);
}
