import path from "node:path";
import { exportAnalysis } from "./exportAnalysis.js";
import { parseNodeMap } from "./parseNodeMap.js";
import { runFullAnalysis } from "./pipeline.js";

const nodes = parseNodeMap(path.resolve("./data/node_map.csv"));
const analysis = runFullAnalysis(nodes);
exportAnalysis(analysis, path.resolve("./analysis.json"));

console.log("Analysis complete -> analysis.json");
