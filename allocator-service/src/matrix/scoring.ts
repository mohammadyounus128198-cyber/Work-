import type { Metrics } from "./testMatrix";

/**
 * Computes a numeric score from the provided metrics combining safety, cost, and latency.
 *
 * @param metrics - Object containing `safety`, `cost`, and `latency` used to compute the score
 * @returns The score computed as `metrics.safety * 2 - (metrics.cost + metrics.latency / 200)`
 */
export function score(metrics: Metrics): number {
  return metrics.safety * 2 - (metrics.cost + metrics.latency / 200);
}
