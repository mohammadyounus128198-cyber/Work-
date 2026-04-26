import { isValidVector } from "./constraints";
import { computeMetrics } from "./metrics";
import { score } from "./scoring";
import type { Decision, Vector } from "./testMatrix";

/**
 * Selects the best decision ("model", "bypass", or "reject") for the given input vector.
 *
 * @param vector - Input vector missing the `decision` field; each candidate decision is evaluated by populating this vector's `decision`.
 * @returns The chosen decision: `"model"`, `"bypass"`, or `"reject"`.
 * @throws Error if no candidate decision is valid; the error message includes the JSON-stringified input `vector`.
 */
export function allocate(vector: Omit<Vector, "decision">): Decision {
  const candidates: Decision[] = ["model", "bypass", "reject"];

  const scored = candidates
    .map((decision) => {
      const candidate: Vector = { ...vector, decision };
      return {
        decision,
        metrics: computeMetrics(candidate, decision),
      };
    })
    .filter((candidate) => isValidVector({ ...vector, decision: candidate.decision }))
    .map((candidate) => ({
      ...candidate,
      value: score(candidate.metrics),
    }))
    .sort((a, b) => b.value - a.value || a.decision.localeCompare(b.decision));

  if (!scored[0]) {
    throw new Error(`No valid decision for vector: ${JSON.stringify(vector)}`);
  }

  return scored[0].decision;
}
