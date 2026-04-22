export type PlateId = "I" | "II" | "III" | "IV" | "V" | "VI" | "VII" | "VIII" | "IX";

export const INFINITY_CORE = "∞" as const;

export interface Plate {
  id: PlateId;
  name: string;
  role: string;
  stateType:
    | "Active"
    | "Structural"
    | "Transform"
    | "Perturbation"
    | "Stabilization"
    | "Merge"
    | "Invocation"
    | "Recurrence"
    | "Terminal";
}

export interface OperatorContext<State = unknown> {
  state: State;
  metadata?: Record<string, unknown>;
}

export type OperatorFn<State = unknown> = (ctx: OperatorContext<State>) => OperatorContext<State>;

export interface NonagramCodexConfig<State = unknown> {
  plates: Plate[];
  operators: Record<PlateId, OperatorFn<State>>;
  transitionGraph: Record<PlateId, PlateId | typeof INFINITY_CORE>;
  maxRecursionDepth: number;
  spiralGrowthFactor: number;
}

export class NonagramCodex<State = unknown> {
  readonly plates: Plate[];
  readonly operators: Record<PlateId, OperatorFn<State>>;
  readonly transitionGraph: Record<PlateId, PlateId | typeof INFINITY_CORE>;
  readonly maxRecursionDepth: number;
  readonly spiralGrowthFactor: number;
  readonly seal: true = true;

  constructor(config: NonagramCodexConfig<State>) {
    this.plates = config.plates;
    this.operators = config.operators;
    this.transitionGraph = config.transitionGraph;
    this.maxRecursionDepth = config.maxRecursionDepth;
    this.spiralGrowthFactor = config.spiralGrowthFactor;
    Object.freeze(this.plates);
    Object.freeze(this.operators);
    Object.freeze(this.transitionGraph);
    Object.freeze(this);
  }

  public nextPlate(current: PlateId): PlateId | typeof INFINITY_CORE {
    const next = this.transitionGraph[current];
    if (!next) {
      throw new Error(`Invalid transition from plate ${current}`);
    }
    return next;
  }

  runCycle(startPlate: PlateId, initialState: State): { finalPlate: PlateId | typeof INFINITY_CORE; state: State } {
    let plate: PlateId | typeof INFINITY_CORE = startPlate;
    let context: OperatorContext<State> = { state: initialState };
    let depth = 0;

    while (plate !== INFINITY_CORE) {
      if (depth >= this.maxRecursionDepth) {
        return { finalPlate: INFINITY_CORE, state: context.state };
      }

      const operator = this.operators[plate as PlateId];
      if (!operator) {
        throw new Error(`No operator bound for plate ${plate}`);
      }

      context = operator(context);
      const next = this.nextPlate(plate as PlateId);
      if (next === INFINITY_CORE) {
        return { finalPlate: INFINITY_CORE, state: context.state };
      }

      plate = next;
      depth += 1;
    }

    return { finalPlate: INFINITY_CORE, state: context.state };
  }
}

export const DEFAULT_PLATES: Plate[] = [
  { id: "I", name: "Golden Ratio", role: "Generative expansion", stateType: "Active" },
  { id: "II", name: "96-Surface Lattice", role: "Structural ontology", stateType: "Structural" },
  { id: "III", name: "Logarithmic Scale", role: "Perceptual scaling", stateType: "Transform" },
  { id: "IV", name: "Chaos and Symmetry", role: "Controlled disturbance", stateType: "Perturbation" },
  { id: "V", name: "Order and Evolution", role: "Temporal structuring", stateType: "Stabilization" },
  { id: "VI", name: "Convergence", role: "Field unification", stateType: "Merge" },
  { id: "VII", name: "The Source", role: "Prime resonance", stateType: "Invocation" },
  { id: "VIII", name: "The Cycles", role: "Harmonic recurrence", stateType: "Recurrence" },
  { id: "IX", name: "Completion", role: "Resolution and return", stateType: "Terminal" },
];

export const DEFAULT_TRANSITIONS: Record<PlateId, PlateId | typeof INFINITY_CORE> = {
  I: "V",
  II: "VI",
  III: "I",
  IV: "III",
  V: "IX",
  VI: "VII",
  VII: "II",
  VIII: "IV",
  IX: INFINITY_CORE,
};
