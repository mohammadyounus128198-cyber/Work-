import type { CoherenceState, MirrorReport, Observation } from "./types.js";

export function createObservation(
  tick: number,
  state: CoherenceState,
  mirror: MirrorReport
): Observation {
  return {
    tick,
    nodeId: state.id,
    coherence: state.coherence,
    alignment: state.alignment,
    shellIntegrity: state.shellIntegrity,
    symbolicLoad: state.symbolicLoad,
    temporalOffset: state.temporalOffset,
    faults: [...state.faultFlags],
    driftScore: mirror.driftScore
  };
}
