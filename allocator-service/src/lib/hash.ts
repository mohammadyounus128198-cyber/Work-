import crypto from "node:crypto";

/**
 * Normalize newline sequences to use LF (`\n`).
 *
 * @param value - Input string that may contain CRLF (`\r\n`) or CR (`\r`) newlines
 * @returns The string with all `\r\n` and `\r` sequences replaced by `\n`
 */
function normalizeString(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

/**
 * Normalize a number for deterministic hashing.
 *
 * Converts -0 to 0, rounds non-integer numbers to 12 decimal places, and preserves integers.
 *
 * @param value - The number to normalize before hashing
 * @returns The normalized numeric value
 * @throws Error if `value` is not a finite number
 */
function normalizeNumber(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Cannot hash non-finite numbers.");
  }

  if (Object.is(value, -0)) {
    return 0;
  }

  if (Number.isInteger(value)) {
    return value;
  }

  return Number(value.toFixed(12));
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
/**
 * Recursively produces a canonical form of `value` by sorting object keys and normalizing primitives.
 *
 * Processes arrays by applying the same transformation to each element. For objects, returns a new plain object with keys sorted lexicographically and values recursively canonicalized. Strings are normalized for newline consistency and numbers are normalized (including handling of -0 and rounding for non-integers).
 *
 * @param value - The input value to canonicalize and sort
 * @returns A new value equivalent to `value` but with object keys sorted and primitives normalized
 */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortKeys(entry));
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonicalize((value as Record<string, unknown>)[key]);
        acc[key] = sortKeys((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  if (typeof value === "string") {
    return normalizeString(value);
  }

  if (typeof value === "number") {
    return normalizeNumber(value);
  }

  return value;
}

/**
 * Produces the SHA-256 hex digest of the canonical JSON representation of a value.
 *
 * The value is canonicalized and JSON-stringified with a trailing newline prior to hashing.
 *
 * @param value - The value to canonicalize and hash (any JSON-serializable value)
 * @returns The SHA-256 digest as a lowercase hex string of the canonical JSON plus a trailing newline
 */
export function sha256Json(value: unknown): string {
  const canonicalJson = `${JSON.stringify(canonicalize(value))}\n`;
  return crypto.createHash("sha256").update(canonicalJson, "utf8").digest("hex");
  return value;
}

/**
 * Produce a JSON string whose object keys are ordered deterministically.
 *
 * @param value - The value to serialize; for objects, keys are sorted before serialization. Arrays and primitive values are serialized as with `JSON.stringify`.
 * @returns A JSON string representation of `value` with object keys sorted in a stable order
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

/**
 * Compute the SHA-256 digest of a string and return it as a hexadecimal string.
 *
 * @param value - The input string to hash; it is encoded as UTF-8.
 * @returns The SHA-256 digest of `value` encoded as a hexadecimal string.
 */

/**
 * Serialize a value into a deterministic JSON-like string where object keys are sorted and properties with `undefined` are omitted.
 *
 * The output preserves array order and uses JSON stringification for primitive values and object keys.
 *
 * @param value - The value to serialize
 * @returns A deterministic string representation suitable for stable hashing
 */

/**
 * Compute the SHA-256 hash of a value's deterministic serialization.
 *
 * The value is serialized into a deterministic JSON-like string (object keys sorted, `undefined` properties omitted) and then hashed.
 *
 * @param value - The value to serialize and hash
 * @returns The SHA-256 digest (hexadecimal) of the deterministic serialization of `value`
 */

/**
 * Compute the SHA-256 hash of a value's deterministic serialization.
 *
 * The value is serialized into a deterministic JSON-like string (object keys sorted, `undefined` properties omitted) and then hashed.
 *
 * @param value - The value to serialize and hash
 * @returns The SHA-256 digest (hexadecimal) of the deterministic serialization of `value`
 */

/**
 * Compute the SHA-256 hash of a value's deterministic serialization.
 *
 * The value is serialized into a deterministic JSON-like string (object keys sorted, `undefined` properties omitted) and then hashed.
 *
 * @param value - The value to serialize and hash
 * @returns The SHA-256 digest (hexadecimal) of the deterministic serialization of `value`
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
