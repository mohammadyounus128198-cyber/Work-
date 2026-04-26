import { isValidVector } from "../matrix/constraints";
import { assertInvariants, type MetricsHook } from "../matrix/invariants";
import type { AllocatorResponse, Vector } from "../matrix/testMatrix";

/**
 * Compute the latency (in milliseconds) for a given allocation vector.
 *
 * The returned latency is determined from `vector.mode`, `vector.decision`, and `vector.env`:
 * - Streaming mode: `140` ms in production, `110` ms otherwise.
 * - Defer decision: `280` ms in production, `230` ms otherwise.
 * - All other cases: `190` ms in production, `160` ms otherwise.
 *
 * @param vector - Input `Vector` whose `mode`, `decision`, and `env` fields influence latency
 * @returns The computed latency in milliseconds
 */
function resolveLatency(vector: Vector): number {
  if (vector.mode === "streaming") {
    return vector.env === "production" ? 140 : 110;
  }

  if (vector.decision === "defer") {
    return vector.env === "production" ? 280 : 230;
  }

  return vector.env === "production" ? 190 : 160;
}

/**
 * Produce an AllocatorResponse for the given Vector by applying deterministic runtime rules.
 *
 * @param vector - Input decision/context vector; must satisfy `isValidVector` or the function throws.
 * @returns An AllocatorResponse with the following fields:
 * - `headers`: response headers (`"Content-Type": "application/json"`).
 * - `autoApproved`: `true` when `decision === "model"`, `auth === "protected"`, and `risk` is `"low"` or `"medium"`.
 * - `apiCalls`: `0` if the request is deferred, otherwise `1`.
 * - `latency`: numeric latency value derived from the vector.
 * - `stream`: `true` when `mode === "streaming"`.
 * - `deferred`: `true` when `decision === "defer"`.
 * @throws Error when `vector` is invalid (does not satisfy `isValidVector`).
 */
export async function runAllocator(vector: Vector): Promise<AllocatorResponse> {
  if (!isValidVector(vector)) {
    throw new Error("Invalid vector");
  }

  const deferred = vector.decision === "defer";

  const autoApproved =
    vector.decision === "model" &&
    vector.auth === "protected" &&
    (vector.risk === "low" || vector.risk === "medium");

  return {
    headers: {
      "Content-Type": "application/json",
    },
    autoApproved,
    apiCalls: deferred ? 0 : 1,
    latency: resolveLatency(vector),
    stream: vector.mode === "streaming",
    deferred,
  };
}

/**
 * Runs the allocator for the given vector and verifies runtime invariants before returning the response.
 *
 * @param vector - The input allocation vector to evaluate
 * @param metricsHook - Optional hook invoked by invariant assertions for recording metrics
 * @returns The computed AllocatorResponse for `vector`
 */
export async function safeRunAllocator(
  vector: Vector,
  metricsHook?: MetricsHook,
): Promise<AllocatorResponse> {
  const res = await runAllocator(vector);
  assertInvariants(vector, res, metricsHook);
  return res;
}
