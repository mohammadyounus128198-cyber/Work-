from __future__ import annotations

from pathlib import Path
from typing import Iterable

import matplotlib.pyplot as plt
from matplotlib import animation


COLOR_PALETTE = [
    "#ff6b6b",
    "#4ecdc4",
    "#ffe66d",
    "#5f27cd",
    "#1dd1a1",
    "#ff9f43",
]


def _position_map(nodes: list[dict]) -> dict[str, tuple[float, float]]:
    return {node["node_id"]: (node["x"], node["y"]) for node in nodes}


def _color_map(basins: list[dict]) -> dict[str, str]:
    colors: dict[str, str] = {}
    for index, basin in enumerate(basins):
        color = COLOR_PALETTE[index % len(COLOR_PALETTE)]
        for member in basin["members"]:
            colors[member] = color
    return colors


def visualize_basin_mapping(nodes: list[dict], edges: list[dict], basins: list[dict]) -> None:
    positions = _position_map(nodes)
    colors = _color_map(basins)

    fig, ax = plt.subplots(figsize=(8, 8))
    for edge in edges:
        x1, y1 = positions[edge["from"]]
        x2, y2 = positions[edge["to"]]
        ax.plot([x1, x2], [y1, y2], color="#999", linewidth=1, alpha=0.7)

    for node in nodes:
        color = colors.get(node["node_id"], "#c8d6e5")
        ax.scatter(node["x"], node["y"], s=100, c=color, edgecolors="black")
        ax.text(node["x"] + 1.2, node["y"] + 1.2, node["node_id"], fontsize=8)

    ax.set_title("Basin Mapping")
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.set_aspect("equal", adjustable="box")
    fig.tight_layout()
    output = Path("basin_mapping.png")
    fig.savefig(output, dpi=150)
    plt.close(fig)


def animate_simulation_paths(
    nodes: list[dict],
    edges: list[dict],
    basins: list[dict],
    paths: Iterable[list[str]],
) -> None:
    positions = _position_map(nodes)
    colors = _color_map(basins)
    max_len = max((len(path) for path in paths), default=0)
    if max_len == 0:
        return

    paths = list(paths)
    fig, ax = plt.subplots(figsize=(8, 8))

    for edge in edges:
        x1, y1 = positions[edge["from"]]
        x2, y2 = positions[edge["to"]]
        ax.plot([x1, x2], [y1, y2], color="#e5e5e5", linewidth=1)

    for node in nodes:
        color = colors.get(node["node_id"], "#c8d6e5")
        ax.scatter(node["x"], node["y"], s=70, c=color, edgecolors="black", alpha=0.6)

    trail_lines = [ax.plot([], [], linewidth=2, alpha=0.8)[0] for _ in paths]

    def update(frame: int):
        for index, path in enumerate(paths):
            segment = path[: frame + 1]
            if len(segment) < 2:
                trail_lines[index].set_data([], [])
                continue

            coords = [positions[node_id] for node_id in segment]
            xs, ys = zip(*coords)
            trail_lines[index].set_data(xs, ys)
            trail_lines[index].set_color(colors.get(segment[-1], "#576574"))
        return trail_lines

    ax.set_title("Simulation Convergence")
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.set_aspect("equal", adjustable="box")
    fig.tight_layout()

    anim = animation.FuncAnimation(fig, update, frames=max_len, interval=300, blit=False)
    anim.save("simulation_paths.gif", writer="pillow", fps=4)
    plt.close(fig)
