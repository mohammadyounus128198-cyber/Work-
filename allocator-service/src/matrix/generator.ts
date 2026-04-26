import { AUTHS, DECISIONS, ENVS, MODES, RISKS, type Vector } from "./testMatrix";
import { isValidVector } from "./constraints";

/**
           * Generate all valid vectors from every combination of environment, mode, risk, decision, and auth.
           *
           * @returns An array of Vector objects for each combination of `env`, `mode`, `risk`, `decision`, and `auth` that passes `isValidVector`
           */
          export function generateAllVectors(): Vector[] {
  const out: Vector[] = [];
import { isValidVector } from "./constraints";
import {
  AUTHS,
  DECISIONS,
  ENVS,
  MODES,
  RISKS,
  type Vector,
} from "./testMatrix";

export function generateAllVectors(): Vector[] {
  const vectors: Vector[] = [];

  for (const env of ENVS) {
    for (const mode of MODES) {
      for (const risk of RISKS) {
        for (const decision of DECISIONS) {
          for (const auth of AUTHS) {
            const vector: Vector = { env, mode, risk, decision, auth };
            if (isValidVector(vector)) {
              out.push(vector);
            }
          }
        }
      }
    }
  }

  return out;
              vectors.push(vector);
            }
          }
        }
      }
    }
  }

  return vectors;
}
