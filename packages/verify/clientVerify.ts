// 🔱 CLIENT VERIFICATION LAYER — Ed25519 + Hash Enforcement

import nacl from 'tweetnacl';

/**
 * Decodes a base64-encoded string into a byte array.
 *
 * @param s - The base64-encoded input string
 * @returns A Uint8Array containing the decoded bytes
 */
function decodeBase64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

/**
 * Convert a hex-encoded string into a byte array.
 *
 * @param hex - An even-length string of hexadecimal characters (`0-9`, `a-f`, `A-F`), where each pair represents one byte
 * @returns A `Uint8Array` whose elements are the bytes parsed from each pair of hex characters in `hex`
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Compares two byte arrays for equality while avoiding early exits that could leak timing information.
 *
 * @param a - The first byte sequence to compare
 * @param b - The second byte sequence to compare
 * @returns `true` if `a` and `b` have the same length and identical bytes, `false` otherwise
 */
function equalBytes(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let v = 0;
  for (let i = 0; i < a.length; i++) v |= a[i] ^ b[i];
  return v === 0;
}

/**
 * Verifies that a canonical payload's SHA-256 hash matches a provided hash and that an Ed25519 detached signature over that hash is valid.
 *
 * @param proof - Object containing the proof to verify. Expected properties:
 *   - `canonicalPayload`: base64-encoded payload whose SHA-256 digest will be computed
 *   - `hash`: expected hash as a hex string (if hex characters) or as a base64 string
 *   - `signature`: base64-encoded Ed25519 detached signature
 *   - `publicKey`: base64-encoded Ed25519 public key
 * @returns `true` if the computed SHA-256 digest of `canonicalPayload` equals `hash` and `signature` is a valid Ed25519 signature for that digest using `publicKey`, `false` otherwise.
 */
export async function verifyProof(proof: any): Promise<boolean> {
  try {
    const canonicalBytes = decodeBase64(proof.canonicalPayload);

    const hashBuffer = await crypto.subtle.digest('SHA-256', canonicalBytes);
    const localHash = new Uint8Array(hashBuffer);

    const serverHash = /^[0-9a-fA-F]+$/.test(proof.hash)
      ? hexToBytes(proof.hash)
      : decodeBase64(proof.hash);

    if (!equalBytes(localHash, serverHash)) {
      console.error('Hash mismatch');
      return false;
    }

    const sig = decodeBase64(proof.signature);
    const pub = decodeBase64(proof.publicKey);

    const verified = nacl.sign.detached.verify(localHash, sig, pub);

    if (!verified) {
      console.error('Signature verification failed');
      return false;
    }

    return true;
  } catch (err) {
    console.error('Verification error', err);
    return false;
  }
}
