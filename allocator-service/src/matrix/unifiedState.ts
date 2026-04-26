import { sha256JsonStable } from "../lib/hash";
import type { Decision } from "./testMatrix";

export const SYSTEM_VERSION = "1.0.0" as const;
export const EXPECTED_FRONTIER_CARDINALITY = 36 as const;

export type Metrics = {
  safety: number;
  cost: number;
  latency: number;
};

export type FrontierCandidate = {
  id: string;
  decision: Decision;
  metrics: Metrics;
};

export type VisualPosture = "stable" | "alert" | "restricted";

export type VisualState = {
  eyeIntensity: number;
  glowSpread: number;
  posture: VisualPosture;
  background: "void";
};

export type CanonicalState = {
  frontier: FrontierCandidate[];
  selected: FrontierCandidate;
  policy: "safety-first-v1";
};

export type UnifiedState = {
  version: typeof SYSTEM_VERSION;
  canonical: CanonicalState;
  visual: VisualState;
  hashes: {
    canonical: string;
    visual: string;
    binding: string;
  };
};

/**
 * Round a numeric metric to three decimal places.
 *
 * @param value - The metric value to normalize
 * @returns The input rounded to three decimal places
 */
function normalizeMetric(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

/**
 * Determine the sort order of two frontier candidates using prioritized criteria.
 *
 * Comparison precedence: higher `metrics.safety` first, then lower `metrics.cost`, then lower `metrics.latency`,
 * then lexicographic `decision`, then lexicographic `id`.
 *
 * @param a - The first frontier candidate to compare
 * @param b - The second frontier candidate to compare
 * @returns A negative number if `a` should come before `b`, a positive number if `a` should come after `b`, or `0` if they are equivalent
 */
function compareCandidates(a: FrontierCandidate, b: FrontierCandidate): number {
  return (
    b.metrics.safety - a.metrics.safety ||
    a.metrics.cost - b.metrics.cost ||
    a.metrics.latency - b.metrics.latency ||
    a.decision.localeCompare(b.decision) ||
    a.id.localeCompare(b.id)
  );
}

/**
 * Recursively freezes a value and any nested object values, returning the original reference.
 *
 * If `value` is non-null and an object, the function freezes that object and all nested
 * object values reachable via its enumerable own properties. Non-object values are returned unchanged.
 *
 * @param value - The value to deep-freeze
 * @returns The same `value` reference after freezing objects (unchanged for non-objects)
 */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
  }
  return value;
}

/**
 * Produce a VisualState from a canonical frontier and its selected candidate.
 *
 * @param frontier - The ordered list of frontier candidates used to derive visual proportions.
 * @param selected - The candidate whose metrics and decision determine visual emphasis.
 * @returns A VisualState where `eyeIntensity` equals `selected.metrics.safety`, `glowSpread` equals `frontier.length / 3`, `posture` is `"stable"` for decision `"model"`, `"alert"` for `"defer"`, and `"restricted"` otherwise, and `background` is `"void"`.
 */
export function mapToVisual(frontier: FrontierCandidate[], selected: FrontierCandidate): VisualState {
  return {
    eyeIntensity: selected.metrics.safety,
    glowSpread: frontier.length / 3,
    posture:
      selected.decision === "model"
        ? "stable"
        : selected.decision === "defer"
          ? "alert"
          : "restricted",
    background: "void",
  };
}

/**
 * Ensure `eyeIntensity` is within the inclusive range 0 to 1.
 *
 * @param eyeIntensity - The visual intensity value to validate; expected to represent safety on a 0–1 scale
 * @throws Error if `eyeIntensity` is less than 0 or greater than 1
 */
function validateEyeIntensityRange(eyeIntensity: number): void {
  if (eyeIntensity < 0 || eyeIntensity > 1) {
    throw new Error("Invalid visual range: eyeIntensity must be between 0 and 1");
  }
}

/**
 * Ensures the frontier contains at least one actionable candidate.
 *
 * @param frontier - Array of frontier candidates to validate
 * @throws `Error` when every candidate in `frontier` has `decision === "reject"`
 */
function assertUtility(frontier: FrontierCandidate[]): void {
  if (frontier.every((candidate) => candidate.decision === "reject")) {
    throw new Error("Degenerate system: no actionable paths");
  }
}

/**
 * Produce a stable binding hash that cryptographically binds a canonical hash to a visual hash.
 *
 * @param canonicalHash - The SHA-256 stable hash string representing the canonical state (as produced by `sha256JsonStable`)
 * @param visualHash - The SHA-256 stable hash string representing the visual state (as produced by `sha256JsonStable`)
 * @returns The SHA-256 stable hash string of an object `{ canonical: canonicalHash, visual: visualHash }`
 */
function computeBindingHash(canonicalHash: string, visualHash: string): string {
  return sha256JsonStable({ canonical: canonicalHash, visual: visualHash });
}

/**
 * Constructs an immutable UnifiedState from a frontier of candidates and an optional selected candidate.
 *
 * Normalizes metric precision, orders and validates the frontier, derives a VisualState from the selected candidate,
 * computes stable SHA-256 hashes for canonical, visual, and their binding, and returns a deeply frozen UnifiedState.
 *
 * @param frontierInput - Array of FrontierCandidate values that must contain exactly EXPECTED_FRONTIER_CARDINALITY entries.
 * @param selectedId - Optional id of the candidate to mark as selected; if omitted the top-ranked candidate is used.
 * @returns The constructed, deeply frozen UnifiedState containing `version`, `canonical`, `visual`, and `hashes`.
 * @throws Error "Dead state: no valid decisions" if `frontierInput` is empty.
 * @throws Error "state drift: expected frontier cardinality 36" if `frontierInput` length differs from EXPECTED_FRONTIER_CARDINALITY.
 * @throws Error "No selected decision — undefined visual state" if a requested `selectedId` does not correspond to any candidate.
 * @throws Error "Selected not in frontier" if the computed selected candidate is not present in the normalized frontier.
 * @throws Error "Visual mismatch: safety encoding broken" if the visual `eyeIntensity` does not equal the selected candidate's safety metric.
 * @throws Error from `assertUtility` or `validateEyeIntensityRange` when the frontier is fully non-actionable or the visual eye intensity is out of range.
 */
export function buildUnifiedState(
  frontierInput: FrontierCandidate[],
  selectedId?: string,
): UnifiedState {
  if (frontierInput.length === 0) {
    throw new Error("Dead state: no valid decisions");
  }

  if (frontierInput.length !== EXPECTED_FRONTIER_CARDINALITY) {
    throw new Error(`state drift: expected frontier cardinality ${EXPECTED_FRONTIER_CARDINALITY}`);
  }

  const frontier = frontierInput
    .map((candidate) => ({
      ...candidate,
      metrics: {
        safety: normalizeMetric(candidate.metrics.safety),
        cost: normalizeMetric(candidate.metrics.cost),
        latency: normalizeMetric(candidate.metrics.latency),
      },
    }))
    .sort(compareCandidates);

  assertUtility(frontier);

  const selected = selectedId
    ? frontier.find((candidate) => candidate.id === selectedId)
    : frontier[0];

  if (!selected) {
    throw new Error("No selected decision — undefined visual state");
  }

  if (!frontier.some((candidate) => candidate.id === selected.id)) {
    throw new Error("Selected not in frontier");
  }

  const visual = mapToVisual(frontier, selected);
  validateEyeIntensityRange(visual.eyeIntensity);

  if (visual.eyeIntensity !== selected.metrics.safety) {
    throw new Error("Visual mismatch: safety encoding broken");
  }

  const canonical: CanonicalState = {
    frontier,
    selected,
    policy: "safety-first-v1",
  };

  const canonicalHash = sha256JsonStable(canonical);
  const visualHash = sha256JsonStable(visual);
  const bindingHash = computeBindingHash(canonicalHash, visualHash);

  return deepFreeze({
    version: SYSTEM_VERSION,
    canonical,
    visual,
    hashes: {
      canonical: canonicalHash,
      visual: visualHash,
      binding: bindingHash,
    },
  });
}

/**
 * Verify a UnifiedState's version, integrity hashes, and semantic consistency, and return the recomputed visual representation.
 *
 * @param unified - The UnifiedState to verify.
 * @returns The recomputed VisualState derived from `unified.canonical`.
 * @throws Error with message "version mismatch" if `unified.version` differs from the expected system version.
 * @throws Error with message "Render aborted: canonical integrity failure" if the canonical hash does not match.
 * @throws Error with message "Render aborted: visual integrity failure" if the visual hash does not match.
 * @throws Error with message "Render aborted: cross-binding integrity failure" if the binding hash does not match the recomputed canonical+visual hashes.
 * @throws Error with message "Render aborted: semantic mismatch" if the recomputed visual's `eyeIntensity` does not equal `unified.canonical.selected.metrics.safety`.
 * @throws Error from `validateEyeIntensityRange` if the recomputed visual's `eyeIntensity` is outside the allowed range (0 to 1).
 */
export function verifyUnifiedState(unified: UnifiedState): VisualState {
  if (unified.version !== SYSTEM_VERSION) {
    throw new Error("version mismatch");
  }

  const recomputedCanonicalHash = sha256JsonStable(unified.canonical);
  if (recomputedCanonicalHash !== unified.hashes.canonical) {
    throw new Error("Render aborted: canonical integrity failure");
  }

  const recomputedVisual = mapToVisual(
    unified.canonical.frontier,
    unified.canonical.selected,
  );
  const recomputedVisualHash = sha256JsonStable(recomputedVisual);

  if (recomputedVisualHash !== unified.hashes.visual) {
    throw new Error("Render aborted: visual integrity failure");
  }

  const recomputedBindingHash = computeBindingHash(
    recomputedCanonicalHash,
    recomputedVisualHash,
  );
  if (recomputedBindingHash !== unified.hashes.binding) {
    throw new Error("Render aborted: cross-binding integrity failure");
  }

  if (recomputedVisual.eyeIntensity !== unified.canonical.selected.metrics.safety) {
    throw new Error("Render aborted: semantic mismatch");
  }

  validateEyeIntensityRange(recomputedVisual.eyeIntensity);

  return recomputedVisual;
}

/**
 * Verifies a UnifiedState, invokes the provided draw callback with the verified visual state, and returns that visual.
 *
 * @param unified - The unified state to verify and render
 * @param draw - Callback that receives the verified VisualState for rendering
 * @returns The verified VisualState that was passed to `draw`
 */
export function safeRender(
  unified: UnifiedState,
  draw: (visual: VisualState) => void,
): VisualState {
  const verifiedVisual = verifyUnifiedState(unified);
  draw(verifiedVisual);
  return verifiedVisual;
}
