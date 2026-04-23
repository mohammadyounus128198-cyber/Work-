import { validateGraph } from "./validateGraph.js";
import { buildAdjacency, generateEdges, type Edge, validateEdges } from "./edges.js";
import type { Node } from "./parseNodeMap.js";
import { simulate, type SimulationResult } from "./simulate.js";

export type Basin = {
  attractorKey: string;
  members: string[];
  size: number;
};

export type SimulationRecord = {
  start: string;
  result: SimulationResult;
};

export type Analysis = {
  nodes: Node[];
  edges: Edge[];
  simulations: SimulationRecord[];
  basins: Basin[];
};

function canonicalAttractorKey(history: string[], window = 5): string {
  const cycle = history.slice(-window);
  const rotations = cycle.map((_, index) => [
    ...cycle.slice(index),
    ...cycle.slice(0, index)
  ]);
  return rotations
    .map((candidate) => candidate.join("->"))
    .sort((left, right) => left.localeCompare(right))[0] ?? "";
}

function mapBasins(simulations: SimulationRecord[]): Basin[] {
  const buckets = new Map<string, string[]>();

  for (const simulation of simulations) {
    if (simulation.result.type !== "ATTRACTOR") {
      continue;
    }

    const key = canonicalAttractorKey(simulation.result.state.history);
    const members = buckets.get(key) ?? [];
    buckets.set(key, [...members, simulation.start]);
  }

  return [...buckets.entries()].map(([attractorKey, members]) => ({
    attractorKey,
    members: [...members].sort(),
    size: members.length
  }));
}

export function runFullAnalysis(nodes: Node[]): Analysis {
  validateGraph(nodes);
  const edges = generateEdges(nodes);
  validateEdges(edges, nodes);
  const adjacency = buildAdjacency(edges);
  const nodeMap = new Map(nodes.map((node) => [node.node_id, node]));

  const simulations = nodes.map((node) => {
    if (node.dormant) {
      return {
        start: node.node_id,
        result: {
          type: "TRANSIENT" as const,
          state: {
            current: node.node_id,
            steps: 0,
            history: [node.node_id]
          },
          steps: 0,
          stability: 0
        }
      };
    }

    const result = simulate(node.node_id, adjacency, nodeMap);
    return { start: node.node_id, result };
  });

  const basins = mapBasins(simulations);

  return {
    nodes,
    edges,
    simulations,
    basins
  };
}
