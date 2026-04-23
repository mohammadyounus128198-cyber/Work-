import { expect, test } from "vitest";
import { parseNodeMap } from "../src/graph/parseNodeMap.js";
import { validateGraph } from "../src/graph/validateGraph.js";

test("node_map passes all invariants", () => {
  const nodes = parseNodeMap("./data/node_map.csv");
  expect(() => validateGraph(nodes)).not.toThrow();
});
