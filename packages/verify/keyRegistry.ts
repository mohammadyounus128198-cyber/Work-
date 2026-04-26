// Multi-authority registry with rotation support

export const KEY_REGISTRY = [
  {
    id: "omega-root-1",
    publicKey: "MCowBQYDK2VwAyEAKccsyrVpp+LvRQ6BERx7xzfhOBJFtDfTHvWzgNtnmqs=",
    status: "ACTIVE",
    createdAt: "2026-04-25T00:00:00Z"
  }
];

/**
 * Retrieve the authority entry that has the given public key.
 *
 * @param publicKey - The authority's public key string to search for
 * @returns The authority object whose `publicKey` equals `publicKey`, or `undefined` if no match is found
 */
export function getAuthority(publicKey) {
  return KEY_REGISTRY.find(a => a.publicKey === publicKey);
}

/**
 * Determine whether an authority object exists and is marked active.
 *
 * @param authority - Authority object to validate; expected to include a `status` property (e.g., `"ACTIVE"`)
 * @returns `true` if `authority` exists and its `status` is exactly `"ACTIVE"`, `false` otherwise.
 */
export function isAuthorityValid(authority) {
  if (!authority) return false;
  if (authority.status !== "ACTIVE") return false;
  return true;
}

/**
 * Classifies an authority outcome based on a verification proof and signature validity.
 *
 * @param proof - The verification proof object containing a `publicKey` used to look up the authority
 * @param signatureValid - `true` if the signature over the proof is valid, `false` otherwise
 * @returns One of: `"REJECTED"` if `signatureValid` is `false`, `"UNKNOWN_AUTHORITY"` if no authority matches the proof's `publicKey`, `"REVOKED"` if the matched authority is not active, or `"TRUSTED"` if the authority is found and valid
 */
export function classifyAuthority(proof, signatureValid) {
  const authority = getAuthority(proof.publicKey);

  if (!signatureValid) return "REJECTED";
  if (!authority) return "UNKNOWN_AUTHORITY";
  if (!isAuthorityValid(authority)) return "REVOKED";

  return "TRUSTED";
}

/**
 * Rotate an authority key by marking the existing key as rotated and registering a new active key.
 *
 * @param oldKey - The public key of the existing authority to mark as rotated
 * @param newKey - The new public key to add to the registry with `ACTIVE` status
 */
export function rotateKey(oldKey, newKey) {
  const authority = getAuthority(oldKey);
  if (authority) authority.status = "ROTATED";

  KEY_REGISTRY.push({
    id: `omega-root-${KEY_REGISTRY.length + 1}`,
    publicKey: newKey,
    status: "ACTIVE",
    createdAt: new Date().toISOString()
  });
}
