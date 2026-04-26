import type { Vector } from "./testMatrix";

/**
 * Validate a Vector against allowed combinations of `mode`, `risk`, `auth`, and `decision`.
 *
 * @param v - The Vector object to validate
 * @returns `true` if the vector satisfies all constraints; `false` if it matches any disallowed combination (for example: `mode === "streaming"` with `decision !== "model"`, `risk === "high"` with `auth === "bypass"`, `risk === "high"` with `decision !== "model"`, `mode === "streaming"` with `auth === "bypass"`, or `decision === "reject"` with `mode === "streaming"`).
 */
export function isValidVector(v: Vector): boolean {
  if (v.mode === "streaming" && v.decision !== "model") return false;
  if (v.risk === "high" && v.auth === "bypass") return false;
  if (v.risk === "high" && v.decision !== "model") return false;
  if (v.mode === "streaming" && v.auth === "bypass") return false;
  if (v.decision === "reject" && v.mode === "streaming") return false;
  return true;
}
