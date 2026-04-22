export type EdgeMap = Record<string, string[]>;

export function neighborsOf(edges: EdgeMap, id: string): string[] {
  return edges[id] ?? [];
}

export function connectUndirected(edges: EdgeMap, a: string, b: string): EdgeMap {
  const next: EdgeMap = { ...edges };
  next[a] = [...(next[a] ?? []), b];
  next[b] = [...(next[b] ?? []), a];
  return next;
}
