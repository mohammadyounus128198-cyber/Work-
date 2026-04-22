import { suggestedRecoveryInstruction } from "../core/faults.js";
import { applyInstruction } from "../core/transitions.js";
import type { CoherenceState, FaultFlag } from "../core/types.js";

export function recoverFromFault(
  state: CoherenceState,
  fault: FaultFlag
): CoherenceState {
  const instruction = suggestedRecoveryInstruction(fault);
  return applyInstruction(state, instruction);
}

export function recoverAllFaults(state: CoherenceState): CoherenceState {
  let current = { ...state };

  for (const fault of state.faultFlags) {
    current = recoverFromFault(current, fault);
  }

  return current;
}
