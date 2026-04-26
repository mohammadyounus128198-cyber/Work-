import { isValidVector } from "./constraints";
import { computeMetrics } from "./metrics";
import { score } from "./scoring";
import type { Decision, Vector } from "./testMatrix";

/**
 * Selects the best decision for a decisionless vector from the available options.
 *
 * @param vector - The input `Vector` without a `decision` field to evaluate
 * @returns The chosen `Decision` (`"model"`, `"bypass"`, or `"reject"`)
 * @throws Error if no valid decision remains for the provided vector; the error message includes the serialized input vector
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
