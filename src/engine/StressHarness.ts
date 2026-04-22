import { enforceInvariants } from "../core/invariants.js";
import { detectFaults } from "../core/faults.js";
import type { CoherenceState } from "../core/types.js";

export type StressEvent =
  | "COHERENCE_SPIKE"
  | "SYMBOLIC_BURST"
  | "TEMPORAL_SKEW"
  | "GROUND_LOSS"
  | "INTENT_SURGE";

export function injectStress(
  state: CoherenceState,
  event: StressEvent
): CoherenceState {
  let next: CoherenceState;

  switch (event) {
    case "COHERENCE_SPIKE":
      next = {
        ...state,
        coherence: state.coherence + 0.25
      };
      break;
    case "SYMBOLIC_BURST":
      next = {
        ...state,
        symbolicLoad: state.symbolicLoad + 0.3
      };
      break;
    case "TEMPORAL_SKEW":
      next = {
        ...state,
        temporalOffset: state.temporalOffset + 0.4
      };
      break;
    case "GROUND_LOSS":
      next = {
        ...state,
        grounded: false,
        stable: false
      };
      break;
    case "INTENT_SURGE":
      next = {
        ...state,
        operatorIntent: state.operatorIntent + 0.35
      };
      break;
  }

  const enforced = enforceInvariants(next);
  return {
    ...enforced,
    faultFlags: detectFaults(enforced)
  };
}
