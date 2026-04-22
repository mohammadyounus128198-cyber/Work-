import { CertificationLevel } from "./types.js";
import type { CoherenceState, MirrorReport } from "./types.js";

export function nextCertificationLevel(
  current: CertificationLevel,
  state: CoherenceState,
  mirror: MirrorReport,
  observationCount: number
): CertificationLevel {
  if (mirror.sealed) {
    return CertificationLevel.SEALED;
  }

  switch (current) {
    case CertificationLevel.EXPERIMENTAL:
      if (mirror.invariantViolations.length === 0) {
        return CertificationLevel.PROVISIONAL;
      }
      return current;
    case CertificationLevel.PROVISIONAL:
      if (mirror.driftScore === 0 && observationCount >= 3) {
        return CertificationLevel.STABLE;
      }
      return current;
    case CertificationLevel.STABLE:
      if (
        mirror.driftScore === 0 &&
        state.faultFlags.length === 0 &&
        observationCount >= 5
      ) {
        return CertificationLevel.CERTIFIED;
      }
      return current;
    case CertificationLevel.CERTIFIED:
    case CertificationLevel.SEALED:
      return current;
    default:
      return current;
  }
}
