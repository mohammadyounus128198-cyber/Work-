import { sha256, stableStringify } from "../lib/hash";
import { allocate } from "./allocator";
import { assertInvariants } from "./invariants";
import { computeMetrics } from "./metrics";
import type { CanonicalState, Vector } from "./testMatrix";

/**
 * Constructs a canonical state from a vector that lacks a `decision`.
 *
 * Allocates a `decision` for the provided `vector`, derives `metrics`, validates invariants, and returns a `CanonicalState` that includes the resolved `vector`, `decision`, `metrics`, and a `proof`.
 *
 * @param vector - Input vector without the `decision` field; its properties are used to compute the allocation and metrics
 * @returns A `CanonicalState` containing the resolved `vector` (including the computed `decision`), the `decision`, `metrics`, and a `proof` where `hash` is the SHA-256 of the canonical base and `invariantsPassed` is `true`
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
