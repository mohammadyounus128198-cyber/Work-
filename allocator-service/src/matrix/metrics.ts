import type { Decision, Metrics, Vector } from "./testMatrix";

/**
 * Compute latency, cost, and safety metrics for a given input vector and decision.
 *
 * @param v - Input vector containing a `risk` level (`high`, `medium`, or other)
 * @param d - Decision indicator (`model`, `bypass`, or other) that influences the metrics
 * @returns An object with `latency` (milliseconds), `cost` (relative cost), and `safety` (safety score between 0 and 1)
 */
export function computeMetrics(v: Vector, d: Decision): Metrics {
  const latency = d === "model" ? 120 : d === "bypass" ? 20 : 10;
  const cost = d === "model" ? 0.8 : d === "bypass" ? 0.2 : 0.05;
  const safety =
    v.risk === "high"
      ? d === "model"
        ? 1
        : 0
      : v.risk === "medium"
        ? d === "bypass"
          ? 0.6
          : 0.9
        : 1;

  return { latency, cost, safety };
}
