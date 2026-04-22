export type SignalType = "market" | "news" | "event" | "sensor";

export type PlateId = "I" | "II" | "III" | "IV" | "V" | "VI" | "VII" | "VIII" | "IX";

export interface Signal {
  id: string;
  name: string;
  type: SignalType;
  timestamp: string;
  source: string;
  source_reputation: number; // 0 to 1
  momentum: number; // -1 to 1 (usually mapped 0 to 1 for intensity, user says 0.72 example)
  volatility: number; // 0 to 1
  confidence: number; // 0 to 1
  entities: string[];
  payload: {
    headline?: string;
    price?: number;
    change_pct?: number;
    [key: string]: any;
  };
  codex_alignment?: PlateId;
}

export interface Scenario {
  name: string;
  probability: number;
  impact: number;
}

export interface HistoricalPoint {
  timestamp: string;
  score: number;
  risk: number;
}

export interface Outcome {
  marketMove: number;
  volatilitySpike: boolean;
  disruptionOccurred: boolean;
  metadata?: any;
}

export interface MemoryEvent {
  id: string;
  timestamp: string;
  features: {
    marketImpact: number;
    supplyDisruption: number;
    securityRisk: number;
    aiShift: number;
    sentiment: number;
    velocity: number;
  };
  score: number;
  decision: string;
  outcome: Outcome;
  label: string;
}

export interface PatternMatch {
  probability: number; // 0 to 1 (similarity)
  outcome: Outcome;
  label: string;
}

export interface ProcessedSignal extends Signal {
  scenarios: Scenario[];
  decision: "DEFEND" | "EXPLOIT" | "HOLD";
  risk: number;
  score: number;
  history: HistoricalPoint[];
  patterns: PatternMatch[]; // Integrated Pattern matches
  trace?: ("IDLE" | "EVAL" | "EXEC")[]; // MFCS 5-move trace
  vesselState?: "IDLE" | "EVAL" | "EXEC"; // Current MFCS state
  invariantStatus?: { passed: boolean; violations: string[] };
  contextSnapshot?: any;
}

export interface GuardianState {
  id: string;
  name: string;
  symbol: string;
  status: "ACTIVE" | "IDLE" | "REGENERATING";
  alignment: number; // 0-100
}

export interface PathState {
  id: string;
  value: number; // 0-100 (Normalization)
  drift: number; // Vector intensity
  risk: number; // Node risk level (0-100)
  momentum: number; // Velocity (0-100)
  importance: number; // Glow/Girth intensity (0-1)
  lastActivation: string;
}

export type AnnotationSeverity = "INFO" | "WARN" | "CRITICAL";

export interface TraceAnnotation {
  id: string;
  createdAt: string;
  author?: string;
  signalId: string;
  label: string;
  note: string;
  severity: AnnotationSeverity;
}

export interface Guardrail {
  id: string;
  name: string;
  description: string;
  threshold: number;
  isActive: boolean;
}

export interface GuardrailEvent {
  id: string;
  timestamp: string;
  guardrailId: string;
  severity: "LOW" | "MED" | "HIGH";
  reason: string;
  step?: CodexStep;
}

export interface CodexStep {
  id: string;
  timestamp: string;
  plateId: PlateId;
  plateName: string;
  operator: string;
  signalId: string;
  trace?: string[];
  metrics: {
    stability: number;
    risk: number;
    momentum: number;
  };
  context?: any;
}

export interface ResilienceState {
  rateLimitState: "STABLE" | "THROTTLED" | "STOP";
  circuitBreaker: "CLOSED" | "OPEN" | "HALF_OPEN";
  lastError?: string;
  latency?: number;
}

export interface StateHash {
  tick: number;
  hash: string;
  timestamp: number;
  metrics: {
    SVI: number;
    OM: number;
  };
  mode: "SCAN" | "FOCUS" | "SIMULATE";
}

export interface OperatorState {
  sessionId: string;
  operatorId: string;
  tick: number; // Added tick tracking
  phi: number; // Phase Potential (0-100)
  readiness: number; // Compression/Readiness stock (0-100)
  s?: number; // Synergy / nonlinear accumulation stock (0-100)
  energy: number; // e from TLA+ (0-100), seeded from phi
  device: "DESKTOP" | "MOBILE" | "CONSOLE";
  engine: {
    phase: "DEFINE" | "GENERATE" | "CHOOSE" | "ACT" | "LEARN" | "RESET";
    status: "IDLE" | "ACTIVE";
  };
  telemetry: {
    SVI: number;
    CBU: number;
    ESQ: number;
    OM: number;
    AP: number;
    pathMap: {
      north: PathState[];
      east: PathState[];
      south: PathState[];
      west: PathState[];
    };
  };
  currentSignal?: ProcessedSignal;
  currentPlate?: PlateId;
  currentOperator?: string;
  steps: CodexStep[];
  annotations: TraceAnnotation[];
  guardrailEvents: GuardrailEvent[];
  plateCounts: Record<PlateId, number>;
  resilience: ResilienceState;
  ui: {
    focusedPanel?: string;
    selectedSignalId?: string;
    focusMode: "SCAN" | "FOCUS" | "SIMULATE";
    targetId?: string;
  };
  lastEvaluation?: EnvelopeEvaluation | null;
  updatedAt: number;
}

export interface MeridianTelemetry {
  // 1. Core Telemetry Channels
  vitalityIndex: number; // SVI
  cognitiveBandwidth: number; // CBU
  environmentalQuality: number; // ESQ
  operationalMomentum: number; // OM
  anomalyPressure: number; // AP

  // 2. Decision Loop (5-Move Engine)
  decisionLoop: {
    perception: "Open" | "In-Motion" | "Complete";
    interpretation: "Open" | "In-Motion" | "Complete";
    decision: "Open" | "In-Motion" | "Complete";
    action: "Open" | "In-Motion" | "Complete";
    learning: "Open" | "In-Motion" | "Complete";
  };

  // 3. 96-Path Map
  pathMap: {
    north: PathState[];
    east: PathState[];
    south: PathState[];
    west: PathState[];
  };

  // 4. metrics
  metrics: {
    stability: number;
    load: number;
    clarity: number;
    momentum: number;
    risk: number;
    harmonicAlignment: number;
    fractalDensity: number;
    snr: number;
  };

  // 5. Guardian Layer
  guardians: GuardianState[];

  // 6. Operator View (Mohammad Saad Younus)
  operator: {
    name: string;
    focus: number;
    energy: number;
    cadence: number;
    driftCorrection: number;
  };

  // Legacy/Support fields
  resilience?: any;
  world: {
    globalPulse: "Calm" | "Volatile" | "Transitional";
    marketTemperature: "Cold" | "Neutral" | "Hot";
    techSignal: "Emerging" | "Accelerating" | "Disruptive";
    weather: {
      location: string;
      temp: number;
      condition: string;
      visibility: string;
    }
  };
  health: {
    heartbeat: boolean;
    artifactIntegrity: boolean;
    guardianAlignment: boolean;
    pathMapPosition: number;
  };
  statusManifest?: {
    system: string;
    sentinel: string;
    guardians: string;
    lattice: string;
  };
}

export interface Config {
  riskTolerance: number;
  alertSensitivity: number;
  focus: string[];
}

export interface EnvelopeEvaluation {
  W: number;
  M_min: number;
  inside: boolean;
  margin: number;
  activeFacet: string;
  facetLabel: string;
  geometryMode: "2D_VERIFIED" | "3D_TRUE_FRONT";
  frontRank: 1 | 2;
  degenerate: boolean;
  activeFacetSet: string[];
  inPhiAttractor: boolean;
  attractorId: "G_phi" | null;
  consistency: "PASS" | "FAIL";
  lawCompliance: {
    phiA: boolean;
    nearRecursion: boolean;
  };
}

export interface MirrorContract {
  id: string;
  name: string;
  version: string;
  geometryMode: "2D_VERIFIED" | "3D_TRUE_FRONT";
  frontRank: 1 | 2;
  degenerate: boolean;
  phiFamily: string[];
  metadata: {
    dimension: number;
    phi_threshold: number;
    laws: Array<{
      id: string;
      name: string;
      formal: string;
    }>;
  };
  constraints: {
    C_phi: number;
    C_r: number;
    C_s?: number;
    M_pred: number;
  };
  attractor?: {
    id: "G_phi";
    governing_facets: string[];
  };
}
