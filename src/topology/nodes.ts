import type { CoherenceState } from "../core/types.js";

export type NodeMap = Record<string, CoherenceState>;

export function listNodeIds(nodes: NodeMap): string[] {
  return Object.keys(nodes);
}

export function cloneNodes(nodes: NodeMap): NodeMap {
  return Object.fromEntries(
    Object.entries(nodes).map(([id, state]) => [id, { ...state }])
  );
}
