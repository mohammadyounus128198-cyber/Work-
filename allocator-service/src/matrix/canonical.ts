import { sha256, stableStringify } from "../lib/hash";
import { allocate } from "./allocator";
import { assertInvariants } from "./invariants";
import { computeMetrics } from "./metrics";
import type { CanonicalState, Vector } from "./testMatrix";

/**
 * Constructs a canonical state from a vector that does not yet include a `decision`.
 *
 * The returned state contains the input vector extended with the computed `decision`,
 * the derived `metrics`, and a `proof` object whose `hash` is a SHA-256 of the base
 * state and whose `invariantsPassed` flag is `true`.
 *
 * @param vector - Input vector missing the `decision` field
 * @returns A `CanonicalState` containing the resolved `vector`, `decision`, `metrics`, and `proof`
 */
export function buildCanonical(vector: Omit<Vector, "decision">): CanonicalState {
  const decision = allocate(vector);
  const resolvedVector: Vector = { ...vector, decision };
  const metrics = computeMetrics(resolvedVector, decision);

  assertInvariants(resolvedVector, decision, metrics);

  const base = {
    vector: resolvedVector,
    decision,
    metrics,
  };

  return {
    ...base,
    proof: {
      hash: sha256(stableStringify(base)),
      invariantsPassed: true,
    },
  };
}
