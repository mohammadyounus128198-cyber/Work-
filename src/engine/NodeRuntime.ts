import { DEFAULT_ADAPTIVE_PROFILE, DEFAULT_STATE } from "../core/constants.js";
import { adaptAlignment } from "../core/adaptation.js";
import { nextCertificationLevel } from "../core/certification.js";
import { isCommandAllowed, type ControlCommand } from "../core/commands.js";
import { modeForCommand, isInstructionAllowed } from "../core/modes.js";
import { createObservation } from "../core/observe.js";
import { runMirror } from "../core/mirror.js";
import { applyInstruction } from "../core/transitions.js";
import { injectStress, type StressEvent } from "./StressHarness.js";
import { recoverAllFaults } from "./RecoveryEngine.js";
import { CertificationLevel, SystemMode } from "../core/types.js";
import type {
  AdaptiveProfile,
  CoherenceState,
  Instruction,
  MirrorReport,
  Observation
} from "../core/types.js";

export class NodeRuntime {
  public state: CoherenceState;
  public profile: AdaptiveProfile;
  public tick = 0;
  public mode: SystemMode = SystemMode.BUILD;
  public certification: CertificationLevel = CertificationLevel.EXPERIMENTAL;
  public observations: Observation[] = [];
  public adaptationFrozen = false;

  constructor(
    state: CoherenceState = DEFAULT_STATE,
    profile: AdaptiveProfile = DEFAULT_ADAPTIVE_PROFILE
  ) {
    this.state = state;
    this.profile = profile;
  }

  public step(
    instruction: Instruction,
    feedback = 0
  ): { state: CoherenceState; mirror: MirrorReport } {
    if (!isInstructionAllowed(this.mode, instruction)) {
      const mirror = runMirror(this.state);
      return { state: this.state, mirror };
    }

    const progressed = applyInstruction(this.state, instruction);
    const adapted = this.adaptationFrozen
      ? progressed
      : adaptAlignment(progressed, feedback, this.profile);

    this.state = adapted;
    this.tick += 1;

    const mirror = runMirror(this.state);
    const observation = createObservation(this.tick, this.state, mirror);
    this.observations.push(observation);

    this.certification = nextCertificationLevel(
      this.certification,
      this.state,
      mirror,
      this.observations.length
    );

    return {
      state: this.state,
      mirror
    };
  }

  public stress(event: StressEvent): { state: CoherenceState; mirror: MirrorReport } {
    this.state = injectStress(this.state, event);
    this.tick += 1;
    const mirror = runMirror(this.state);
    this.observations.push(createObservation(this.tick, this.state, mirror));
    return {
      state: this.state,
      mirror
    };
  }

  public recover(): { state: CoherenceState; mirror: MirrorReport } {
    this.state = recoverAllFaults(this.state);
    this.tick += 1;
    const mirror = runMirror(this.state);
    this.observations.push(createObservation(this.tick, this.state, mirror));
    return {
      state: this.state,
      mirror
    };
  }

  public applyCommand(command: ControlCommand): void {
    if (!isCommandAllowed(this.mode, command, this.certification)) {
      return;
    }

    switch (command) {
      case "RUN_MIRROR":
        this.observations.push(
          createObservation(this.tick, this.state, runMirror(this.state))
        );
        return;
      case "FREEZE_ADAPTATION":
        this.adaptationFrozen = true;
        return;
      case "UNFREEZE_ADAPTATION":
        this.adaptationFrozen = false;
        return;
      case "TRIGGER_ROLLBACK":
        this.state = recoverAllFaults(this.state);
        return;
      default: {
        const mode = modeForCommand(command);
        if (mode !== null) {
          this.mode = mode;
        }
      }
    }
  }
}
