export type WeightMap = Record<string, Record<string, number>>;

export function getWeight(weights: WeightMap, from: string, to: string): number {
  return weights[from]?.[to] ?? 0;
}

export function setWeight(
  weights: WeightMap,
  from: string,
  to: string,
  value: number
): WeightMap {
  return {
    ...weights,
    [from]: {
      ...(weights[from] ?? {}),
      [to]: value
    }
  };
}
