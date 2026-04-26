// Ω PIPELINE — Deterministic, Verified, Recurrence-Aware

export type Artifact = {
  payload: string;
  timestamp: number;
};

export type VerifiedArtifact = Artifact & {
  hash: string;
  phiSync: number;
};

const history: string[] = [];

/**
 * Determine whether a string should be accepted for processing.
 *
 * @param input - The original input string to evaluate
 * @param limit - Maximum allowed original length (inclusive); defaults to 500
 * @returns `true` if `input.trim()` is non-empty and `input.length` is less than or equal to `limit`, `false` otherwise
 */
export function decide(input: string, limit = 500): boolean {
  return input.trim().length > 0 && input.length <= limit;
}

/**
 * Creates an immutable Artifact from the given input by trimming it and recording the current time.
 *
 * @param input - The raw string to trim and store as the artifact payload
 * @returns A frozen Artifact whose `payload` is `input.trim()` and whose `timestamp` is the current Unix epoch milliseconds
 */
export function execute(input: string): Artifact {
  return Object.freeze({
    payload: input.trim(),
    timestamp: Date.now(),
  });
}

/**
 * Computes the SHA-256 digest of the given text and returns it as a lowercase hex string.
 *
 * @param text - Input string to hash
 * @returns The SHA-256 digest of `text` encoded as a lowercase hexadecimal string
 */
export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Produces a verified artifact by computing a deterministic SHA-256 hash for the artifact and attaching a phiSync marker.
 *
 * @param artifact - The artifact to verify; its canonical JSON representation is used to compute the hash.
 * @returns The original artifact augmented with `hash` (lowercase hex SHA-256 of the artifact's canonical JSON) and `phiSync: 0.618`
 */
export async function verify(artifact: Artifact): Promise<VerifiedArtifact> {
  const canonical = JSON.stringify(artifact);
  const hash = await sha256(canonical);
  return { ...artifact, hash, phiSync: 0.618 };
}

/**
 * Determines whether the given SHA-256 hex hash is already present in the module's history.
 *
 * @param hash - The hex-encoded SHA-256 digest to check
 * @returns `true` if the hash exists in the in-memory history, `false` otherwise
 */
export function nearRecurrence(hash: string): boolean {
  return history.includes(hash);
}

/**
 * Appends the given hash to the module-level history of seen hashes.
 *
 * @param hash - The hex-encoded SHA-256 digest to record
 */
export function record(hash: string) {
  history.push(hash);
}

/**
 * Processes a raw input through the Ω pipeline: validates, canonicalizes and verifies it, records its hash, and returns the verified result with recurrence metadata.
 *
 * @param input - The raw input string to process through the pipeline
 * @returns An object containing the verified artifact fields plus `recurrence` (`true` if the artifact's hash was seen before, `false` otherwise) and `seal: "Ω-Verified"`, or `null` if the input failed validation
 */
export async function omegaPipeline(input: string) {
  if (!decide(input)) return null;

  const executed = execute(input);
  const verified = await verify(executed);

  const recurrence = nearRecurrence(verified.hash);
  record(verified.hash);

  return {
    ...verified,
    recurrence,
    seal: "Ω-Verified",
  };
}
