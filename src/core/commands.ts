import { SystemMode } from "./types.js";
import type { CertificationLevel } from "./types.js";

export type ControlCommand =
  | "RUN_MIRROR"
  | "FREEZE_ADAPTATION"
  | "UNFREEZE_ADAPTATION"
  | "TRIGGER_ROLLBACK"
  | "ENTER_BUILD_MODE"
  | "ENTER_OBSERVE_MODE"
  | "ENTER_STRESS_MODE"
  | "ENTER_RECOVER_MODE"
  | "ENTER_SEAL_MODE";

export function isCommandAllowed(
  mode: SystemMode,
  command: ControlCommand,
  certification: CertificationLevel
): boolean {
  switch (command) {
    case "RUN_MIRROR":
      return true;
    case "FREEZE_ADAPTATION":
    case "UNFREEZE_ADAPTATION":
      return mode !== SystemMode.SEAL;
    case "TRIGGER_ROLLBACK":
      return mode === SystemMode.RECOVER || mode === SystemMode.STRESS;
    case "ENTER_BUILD_MODE":
      return certification !== "SEALED";
    case "ENTER_OBSERVE_MODE":
      return true;
    case "ENTER_STRESS_MODE":
      return certification !== "SEALED";
    case "ENTER_RECOVER_MODE":
      return true;
    case "ENTER_SEAL_MODE":
      return mode !== SystemMode.STRESS;
    default:
      return false;
  }
}
