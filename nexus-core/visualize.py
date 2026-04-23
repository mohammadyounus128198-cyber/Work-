import json
from viz import visualize_basin_mapping, animate_simulation_paths


def load_analysis():
    with open("analysis.json", encoding="utf-8") as handle:
        return json.load(handle)


def build_simulation_paths(simulations):
    return [
        simulation["result"]["state"]["history"]
        for simulation in simulations
        if simulation["result"]["type"] == "ATTRACTOR"
    ]


analysis = load_analysis()
nodes = analysis["nodes"]
edges = analysis["edges"]
basins = analysis["basins"]
simulations = analysis["simulations"]
paths = build_simulation_paths(simulations)

visualize_basin_mapping(nodes, edges, basins)
animate_simulation_paths(nodes, edges, basins, paths)
