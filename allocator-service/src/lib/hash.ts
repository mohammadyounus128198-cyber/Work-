import crypto from "node:crypto";

/**
 * Recursively returns a value with all object keys sorted lexicographically while preserving arrays and primitives.
 *
 * @returns A value structurally equivalent to the input where every object's keys are sorted; arrays are preserved (each element processed recursively) and non-object values are returned unchanged.
 */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortKeys(entry));
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
}

/**
 * Produce a deterministic JSON string of `value` with all object keys sorted recursively.
 *
 * @returns A JSON string representing `value` where every object's keys are lexicographically sorted and array element order is preserved.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

/**
 * Compute the SHA-256 hex digest of a UTF-8 string.
 *
 * @param value - The input string to hash
 * @returns The SHA-256 digest encoded as a lowercase hex string
 */

/**
 * Serialize a value to JSON with a stable, deterministic ordering of object keys.
 *
 * This omits object properties whose values are `undefined`. Arrays and primitive values
 * are preserved; `null` is serialized as `null`.
 *
 * @param value - The value to serialize
 * @returns A JSON string with object keys sorted lexicographically and `undefined` properties omitted
 */

/**
 * Compute the SHA-256 hex digest of a stable JSON representation of a value.
 *
 * The value is first serialized using the stable stringify function that sorts object keys,
 * then the UTF-8 bytes of that string are hashed.
 *
 * @param value - The value to serialize and hash
 * @returns The SHA-256 digest of the stable JSON string, encoded as a lowercase hex string
 */

/**
 * Compute the SHA-256 hex digest of a stable JSON representation of a value.
 *
 * Alias of `sha256Json` that hashes the stable JSON serialization of the input.
 *
 * @param value - The value to serialize and hash
 * @returns The SHA-256 digest of the stable JSON string, encoded as a lowercase hex string
 */
export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
function stableStringify(value: unknown): string {
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  const objectValue = value as Record<string, unknown>;
  const keys = Object.keys(objectValue)
    .filter((key) => objectValue[key] !== undefined)
    .sort();

  const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(objectValue[key])}`);
  return `{${entries.join(",")}}`;
  const keys = Object.keys(objectValue).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(objectValue[key])}`)
    .join(",")}}`;
}

export function sha256Json(value: unknown): string {
  return sha256(stableStringify(value));
}

export function sha256JsonStable(value: unknown): string {
export function sha256StableJson(value: unknown): string {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}
