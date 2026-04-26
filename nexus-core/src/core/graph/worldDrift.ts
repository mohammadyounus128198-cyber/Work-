import { sha256Hex } from "./hash.js";

export type WorldDrift = {
  percent: number;
  status: "SYNC" | "DRIFT";
  uiHash: string;
  artifactHash: string;
};

/**
 * Compute drift metrics between a UI payload and an artifact payload.
 *
 * @returns A `WorldDrift` containing:
 * - `uiHash` and `artifactHash`: SHA-256 hex digests of the provided payloads.
 * - `percent`: the drift percentage (0 when hashes match; otherwise the ratio of differing characters to the longer payload length, rounded to two decimal places).
 * - `status`: `"SYNC"` when the hashes are identical, `"DRIFT"` otherwise.
 */
export function calculateWorldDrift(uiPayload: string, artifactPayload: string): WorldDrift {
  const uiHash = sha256Hex(uiPayload);
  const artifactHash = sha256Hex(artifactPayload);

  if (uiHash === artifactHash) {
    return {
      percent: 0,
      status: "SYNC",
      uiHash,
      artifactHash
    };
  }

  const maxLength = Math.max(uiPayload.length, artifactPayload.length, 1);
  const minLength = Math.min(uiPayload.length, artifactPayload.length);
  let mismatches = maxLength - minLength;

  for (let i = 0; i < minLength; i += 1) {
    if (uiPayload.charCodeAt(i) !== artifactPayload.charCodeAt(i)) {
      mismatches += 1;
    }
  }

  const percent = Number(((mismatches / maxLength) * 100).toFixed(2));

  return {
    percent,
    status: "DRIFT",
    uiHash,
    artifactHash
  };
}
