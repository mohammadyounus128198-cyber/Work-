import { describe, expect, test } from "vitest";
import { generateEdges } from "../src/graph/generateEdges.js";
import { parseNodeMap } from "../src/graph/parseNodeMap.js";
import { buildAdjacency, reachableFrom } from "../src/graph/reachability.js";
import { validateEdges } from "../src/graph/validateEdges.js";
import { validateGraph } from "../src/graph/validateGraph.js";

describe("graph traversal", () => {
  test("full graph is valid and connected to central node", () => {
    const nodes = parseNodeMap("./data/node_map.csv");
    validateGraph(nodes);

    const edges = generateEdges(nodes);
    validateEdges(edges, nodes);

    const adjacency = buildAdjacency(edges);
    const reachable = reachableFrom("C01", adjacency);

    expect(reachable.size).toBe(nodes.length);
  });
});
