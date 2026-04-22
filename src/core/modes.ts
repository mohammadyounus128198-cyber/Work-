import { SystemMode } from "./types.js";
import type { Instruction } from "./types.js";
import type { ControlCommand } from "./commands.js";

export function isInstructionAllowed(mode: SystemMode, instruction: Instruction): boolean {
  switch (mode) {
    case SystemMode.BUILD:
      return instruction !== "ADVANCE";
    case SystemMode.OBSERVE:
      return instruction === "DETECT" || instruction === "STABILIZE" || instruction === "GROUND";
    case SystemMode.STRESS:
      return true;
    case SystemMode.RECOVER:
      return instruction === "CORRECT" || instruction === "STABILIZE" || instruction === "GROUND";
    case SystemMode.SEAL:
      return instruction === "DETECT" || instruction === "STABILIZE";
    default:
      return false;
  }
}

export function modeForCommand(command: ControlCommand): SystemMode | null {
  switch (command) {
    case "ENTER_BUILD_MODE":
      return SystemMode.BUILD;
    case "ENTER_OBSERVE_MODE":
      return SystemMode.OBSERVE;
    case "ENTER_STRESS_MODE":
      return SystemMode.STRESS;
    case "ENTER_RECOVER_MODE":
      return SystemMode.RECOVER;
    case "ENTER_SEAL_MODE":
      return SystemMode.SEAL;
    default:
      return null;
  }
}
