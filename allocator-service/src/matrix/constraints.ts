import type { Vector } from "./testMatrix";

/**
 * Determines whether a Vector's mode/decision/risk/auth combination is allowed.
 *
 * @param v - The Vector to validate (evaluates its `mode`, `decision`, `risk`, and `auth` fields)
 * @returns `true` if the vector does not match any disallowed combinations; `false` otherwise.
 * Disallowed combinations:
 * - `mode === "streaming"` and `decision !== "model"`
 * - `risk === "high"` and `auth === "bypass"`
 * - `risk === "high"` and `decision !== "model"`
 * - `mode === "streaming"` and `auth === "bypass"`
 * - `decision === "reject"` and `mode === "streaming"`
 */
export function isValidVector(v: Vector): boolean {
  if (v.mode === "streaming" && v.decision !== "model") return false;
  if (v.risk === "high" && v.auth === "bypass") return false;
  if (v.risk === "high" && v.decision !== "model") return false;
  if (v.mode === "streaming" && v.auth === "bypass") return false;
  if (v.decision === "reject" && v.mode === "streaming") return false;
  return true;
}
