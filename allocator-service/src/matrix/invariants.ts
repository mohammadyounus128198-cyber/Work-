import type { AllocatorResponse, Vector } from "./testMatrix";

export type MetricsHook = (event: string, meta: Record<string, unknown>) => void;

/**
 * Validate allocator-related invariants for the given vector and allocator response, failing on any violation.
 *
 * Performs the following checks and fails if any condition is met:
 * - Missing `Content-Type` header on the allocator response.
 * - High-risk vectors that were auto-approved.
 * - Vectors with decision `defer` that made API calls.
 * - Streaming mode vectors whose reported latency is >= 200 ms.
 *
 * @param v - The vector being validated
 * @param res - The allocator response to validate against the vector
 * @param metricsHook - Optional hook invoked on failure as `("allocator.invariant.violation", { reason, vector: v })`
 * @throws Error when any invariant is violated; the thrown error message contains the failure reason
 */
export function assertInvariants(
  v: Vector,
  res: AllocatorResponse,
  metricsHook?: MetricsHook,
): void {
  function fail(reason: string): never {
    metricsHook?.("allocator.invariant.violation", { reason, vector: v });
    throw new Error(reason);
  }

  if (!res.headers["Content-Type"]) {
    fail("Missing Content-Type");
  }

  if (v.risk === "high" && res.autoApproved) {
    fail("High-risk auto-approved");
  }

  if (v.decision === "defer" && res.apiCalls > 0) {
    fail("Deferred made API call");
  }

  if (v.mode === "streaming" && res.latency >= 200) {
    fail("Streaming latency exceeded");
import type { Decision, Metrics, Vector } from "./testMatrix";

export type InvariantMetricsHook = (event: {
  vector: Vector;
  invariant: string;
  message: string;
}) => void;

export function assertInvariants(
  vector: Vector,
  decision: Decision,
  metrics?: Metrics,
  metricsHook?: InvariantMetricsHook,
): void {
  const fail = (invariant: string, message: string): never => {
    metricsHook?.({ vector, invariant, message });
    throw new Error(`${invariant}: ${message}`);
  };

  if (vector.risk === "high" && decision === "bypass") {
    fail("safety", "unsafe bypass");
  }

  if (vector.mode === "streaming" && decision !== "model") {
    fail("latency", "streaming must use model");
  }

  if (metrics) {
    if (metrics.safety < 0.5) {
      fail("safety", "safety floor violated");
    }

    if (metrics.latency < 0 || metrics.cost < 0) {
      fail("metrics", "invalid metric values");
    }
  }
}
