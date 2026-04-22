import type { EnvelopeEvaluation, MirrorContract, OperatorState } from "./types";

const MAX_NEAR_RECURRENCE_STEPS = 8;
const NEAR_RECURRENCE_EPSILON = 1e-3;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function stateDistance(a: Partial<OperatorState>, b: Partial<OperatorState>) {
  return Math.abs((a.phi ?? 0) - (b.phi ?? 0)) +
    Math.abs((a.readiness ?? 0) - (b.readiness ?? 0)) +
    Math.abs((a.s ?? 0) - (b.s ?? 0)) +
    Math.abs((a.energy ?? 0) - (b.energy ?? 0));
}

function predictStep(state: Partial<OperatorState>): Partial<OperatorState> {
  const next = { ...state };
  const phase = state.engine?.phase ?? "GENERATE";
  const threshold = 60;

  if (phase === "GENERATE") {
    next.phi = clamp((next.phi ?? 0) + 2, 0, 100);
    return next;
  }

  if (phase === "CHOOSE") {
    if ((next.phi ?? 0) >= threshold) {
      const convertedPhi = clamp((next.phi ?? 0) - 1, 0, 100);
      next.phi = convertedPhi;
      next.readiness = clamp((next.readiness ?? 0) + 4, 0, 100);
      next.s = clamp((next.s ?? 0) + Math.max(0, convertedPhi - threshold + 1) * 0.1, 0, 100);
    } else {
      next.phi = clamp((next.phi ?? 0) + 2, 0, 100);
      next.readiness = clamp((next.readiness ?? 0) + 1, 0, 100);
    }
    return next;
  }

  if (phase === "ACT") {
    if ((next.energy ?? 0) === 0 && (next.phi ?? 0) > 0) {
      next.energy = next.phi;
    }
    next.energy = clamp((next.energy ?? 0) - 3, 0, 100);
    return next;
  }

  if (phase === "LEARN") {
    next.readiness = clamp((next.readiness ?? 0) - 5, 0, 100);
    next.phi = clamp((next.phi ?? 0) - 2, 0, 100);
    next.energy = clamp((next.energy ?? 0) - 1, 0, 100);
  }

  return next;
}

function computeNearRecursion(initial: OperatorState) {
  let current: Partial<OperatorState> = { ...initial };

  for (let step = 1; step <= MAX_NEAR_RECURRENCE_STEPS; step += 1) {
    current = predictStep(current);
    if (stateDistance(current, initial) <= NEAR_RECURRENCE_EPSILON) {
      return true;
    }
  }

  return false;
}

function classifyFacet(state: Pick<OperatorState, "phi" | "readiness" | "energy" | "s">) {
  const synergy = state.s ?? 0;

  if (synergy > Math.max(50, state.phi * 0.55)) {
    return {
      activeFacet: "Facet-C",
      facetLabel: "Synergy Lift",
      activeFacetSet: ["Facet-A", "Facet-C"],
    };
  }

  if (state.readiness > state.phi + 18) {
    return {
      activeFacet: "Facet-B",
      facetLabel: "Readiness Compression",
      activeFacetSet: ["Facet-B"],
    };
  }

  return {
    activeFacet: "Facet-A",
    facetLabel: "Phase Dominant",
    activeFacetSet: ["Facet-A"],
  };
}

export function evaluateEnvelope(state: OperatorState, mirror: MirrorContract): EnvelopeEvaluation {
  const synergy = state.s ?? 0;
  const { C_phi, C_r, C_s = 0, M_pred } = mirror.constraints;
  const { activeFacet, facetLabel, activeFacetSet } = classifyFacet(state);
  const phiFamily = mirror.attractor?.governing_facets ?? mirror.phiFamily;

  const W = state.energy + C_phi * state.phi + C_r * state.readiness + C_s * synergy;
  const inside = W <= M_pred;
  const inPhiAttractor = inside && phiFamily.includes(activeFacet);
  const nearRecursion = computeNearRecursion(state);
  const consistency = inside && nearRecursion && !inPhiAttractor ? "FAIL" : "PASS";

  return {
    W,
    M_min: M_pred,
    inside,
    margin: M_pred - W,
    activeFacet,
    facetLabel,
    geometryMode: mirror.geometryMode,
    frontRank: mirror.frontRank,
    degenerate: mirror.degenerate,
    activeFacetSet,
    inPhiAttractor,
    attractorId: inPhiAttractor ? "G_phi" : null,
    consistency,
    lawCompliance: {
      phiA: inPhiAttractor,
      nearRecursion,
    },
  };
}
