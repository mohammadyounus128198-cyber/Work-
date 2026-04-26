import type { Metrics } from "./testMatrix";

/**
 * Compute a numeric score from safety, cost, and latency metrics.
 *
 * The score is calculated as `metrics.safety * 2 - (metrics.cost + metrics.latency / 200)`.
 *
 * @param metrics - Object containing `safety`, `cost`, and `latency` values used to compute the score
 * @returns The computed score: `metrics.safety * 2 - (metrics.cost + metrics.latency / 200)`
 */
export function score(metrics: Metrics): number {
  return metrics.safety * 2 - (metrics.cost + metrics.latency / 200);
}
