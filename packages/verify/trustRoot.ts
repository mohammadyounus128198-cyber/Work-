// 🔱 TRUST ROOT ENFORCEMENT LAYER

// Hardcoded trusted authority keys (ROOT OF TRUST)
export const TRUSTED_KEYS: string[] = [
  "MCowBQYDK2VwAyEAKccsyrVpp+LvRQ6BERx7xzfhOBJFtDfTHvWzgNtnmqs="
];

// Trust classification
export type TrustLevel = "VERIFIED" | "VALID_UNTRUSTED" | "REJECTED";

/**
 * Classifies a proof and its signature into a trust level.
 *
 * @param proof - Object containing a `publicKey` field used to check against the trusted key list
 * @param signatureValid - Whether the signature was verified as valid
 * @returns `'VERIFIED'` if `signatureValid` is true and `proof.publicKey` is in `TRUSTED_KEYS`, `'VALID_UNTRUSTED'` if `signatureValid` is true and the key is not trusted, `'REJECTED'` otherwise
 */
export function classifyTrust(proof: any, signatureValid: boolean): TrustLevel {
  const isTrustedKey = TRUSTED_KEYS.includes(proof.publicKey);

  if (signatureValid && isTrustedKey) {
    return "VERIFIED";
  }

  if (signatureValid && !isTrustedKey) {
    return "VALID_UNTRUSTED";
  }

  return "REJECTED";
}

/**
 * Enforces the trust policy for a proof and returns the resulting trust level.
 *
 * @param proof - Proof object (expected to include a `publicKey`) used to evaluate trust
 * @param signatureValid - Whether the proof's signature has been validated
 * @returns The computed TrustLevel: `VERIFIED` or `VALID_UNTRUSTED`
 * @throws Error when the computed trust level is `REJECTED`
 */
export function enforceTrust(proof: any, signatureValid: boolean) {
  const level = classifyTrust(proof, signatureValid);

  if (level === "REJECTED") {
    throw new Error("Invariant breach: invalid signature");
  }

  if (level === "VALID_UNTRUSTED") {
    console.warn("Untrusted signer detected");
  }

  return level;
}
