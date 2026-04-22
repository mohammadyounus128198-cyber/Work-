import { MeridianTelemetry, ProcessedSignal, CodexStep, GuardrailEvent, TraceAnnotation, PlateId } from "./types";

/**
 * PRODUCTION_DEMO_RUNTIME
 * 
 * Provides a client-side simulation of the Omni-Lattice engine
 * for hosted environments where the WebSocket backend is unreachable.
 */

export const generateInitialState = () => {
  return {
    phi: 42,
    readiness: 65,
    s: 18,
    energy: 12,
    phiStock: 42,
    readinessStock: 65,
    synergyStock: 18,
    energyStock: 12,
    tick: 0,
    startTime: Date.now()
  };
};

export const createDemoStaticTelemetry = (state: any): MeridianTelemetry => {
  return {
    vitalityIndex: 82 + Math.sin(state.tick / 10) * 5,
    cognitiveBandwidth: 74 + Math.cos(state.tick / 15) * 3,
    environmentalQuality: 88,
    operationalMomentum: 62 + (state.energy / 2),
    anomalyPressure: 4 + Math.random() * 2,
    decisionLoop: {
      perception: "Complete",
      interpretation: "Complete",
      decision: "In-Motion",
      action: "Open",
      learning: "Open"
    },
    pathMap: {
      north: Array.from({ length: 24 }).map((_, i) => ({ id: `n-${i}`, value: 40 + Math.random() * 20, drift: 0.1, risk: 5, momentum: 10, importance: 0.5, lastActivation: new Date().toISOString() })),
      east: Array.from({ length: 24 }).map((_, i) => ({ id: `e-${i}`, value: 30 + Math.random() * 20, drift: 0.2, risk: 2, momentum: 5, importance: 0.3, lastActivation: new Date().toISOString() })),
      south: Array.from({ length: 24 }).map((_, i) => ({ id: `s-${i}`, value: 50 + Math.random() * 20, drift: 0.05, risk: 10, momentum: 15, importance: 0.7, lastActivation: new Date().toISOString() })),
      west: Array.from({ length: 24 }).map((_, i) => ({ id: `w-${i}`, value: 60 + Math.random() * 30, drift: 0.1, risk: 8, momentum: 12, importance: 0.6, lastActivation: new Date().toISOString() }))
    },
    metrics: {
      stability: 85 + Math.sin(state.tick / 5) * 4,
      load: 72,
      clarity: 91,
      momentum: 65,
      risk: 14,
      harmonicAlignment: 94,
      fractalDensity: 42,
      snr: 12.8
    },
    guardians: [
      { id: "g1", name: "Synthesis", symbol: "S", status: "ACTIVE", alignment: 94 },
      { id: "g2", name: "Traverser", symbol: "T", status: "ACTIVE", alignment: 88 }
    ],
    operator: {
      name: "Mohammad Saad Younus",
      focus: 0.94,
      energy: state.energy / 100,
      cadence: 1.1,
      driftCorrection: 0.04
    },
    world: {
      globalPulse: "Transitional",
      marketTemperature: "Neutral",
      techSignal: "Accelerating",
      weather: { location: "Dubai", temp: 34, condition: "Clear", visibility: "12km" }
    },
    health: {
      heartbeat: true,
      artifactIntegrity: true,
      guardianAlignment: true,
      pathMapPosition: 0.55
    }
  };
};

export const generateDemoSignals = (tick: number): ProcessedSignal[] => {
  const signalNames = ["ORACLE_PULSE", "LATTICE_SHIFT", "CORE_RESONANCE", "NEURAL_DRIFT", "QUANTUM_FLUX"];
  const plates: PlateId[] = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
  
  return Array.from({ length: 5 }).map((_, i) => ({
    id: `demo-${tick}-${i}`,
    name: signalNames[(i + tick) % signalNames.length],
    type: "market",
    timestamp: new Date().toISOString(),
    source: "NEXUS_DEMO_SOURCE",
    source_reputation: 0.95,
    momentum: 0.4 + Math.random() * 0.4,
    volatility: 0.1 + Math.random() * 0.3,
    confidence: 0.88,
    entities: ["DEMO_NODE", "CORE_SIM"],
    payload: { price: 100 + Math.random() * 10, headline: "Demo Data Active" },
    codex_alignment: plates[(i + tick) % plates.length],
    scenarios: [],
    decision: "HOLD",
    risk: 15,
    score: 85,
    history: [],
    patterns: []
  }));
};

export const generateDemoStep = (tick: number, signal: ProcessedSignal): CodexStep => {
  return {
    id: `step-${tick}`,
    timestamp: new Date().toISOString(),
    plateId: signal.codex_alignment || "I",
    plateName: "Demo Plate",
    operator: "AUTO_SIM",
    signalId: signal.id,
    metrics: { stability: 92, risk: 8, momentum: 75 },
    trace: ["IDLE:INIT", "EVAL:SCAN", "EXEC:SIM"]
  };
};
