export type HarmonicRole =
  | "core"
  | "mirror"
  | "triad"
  | "envelope"
  | "telemetry"
  | "threshold";

export interface HarmonicShell {
  role: HarmonicRole;
  label: string;
  description: string;
  baseHz: number;
  harmonic: number;
  radius: number;
  color: string;
  baseNodes: number;
}

export interface InterferenceEmitter {
  id: string;
  role: HarmonicRole;
  harmonic: number;
  position: [number, number, number];
  amplitude: number;
  falloff: number;
  visualFrequency: number;
}

export const CORE_FREQUENCY_HZ = 167.89;
export const CORE_REFERENCE_NOTE = "E3-ish";
export const CORE_REFERENCE_NOTE_HZ = 164.81;
export const CORE_CENTS_SHARP = 32;
export const CORE_PERIOD_MS = 1000 / CORE_FREQUENCY_HZ;

export const HARMONIC_SHELLS: HarmonicShell[] = [
  {
    role: "core",
    label: "Core Node",
    description: "Anchor / source oscillation",
    baseHz: CORE_FREQUENCY_HZ,
    harmonic: 1,
    radius: 0,
    color: "#ff3b30",
    baseNodes: 1,
  },
  {
    role: "mirror",
    label: "Mirror Layer",
    description: "Synchronization / stabilization",
    baseHz: CORE_FREQUENCY_HZ * 2,
    harmonic: 2,
    radius: 1.0,
    color: "#ff9f43",
    baseNodes: 6,
  },
  {
    role: "triad",
    label: "Triadic Expansion",
    description: "Propagation / articulation",
    baseHz: CORE_FREQUENCY_HZ * 3,
    harmonic: 3,
    radius: 1.8,
    color: "#ffe45e",
    baseNodes: 10,
  },
  {
    role: "envelope",
    label: "Lattice Envelope",
    description: "Containment / geometry",
    baseHz: CORE_FREQUENCY_HZ * 4,
    harmonic: 4,
    radius: 2.7,
    color: "#76e4b3",
    baseNodes: 14,
  },
  {
    role: "telemetry",
    label: "Telemetry Edge",
    description: "Sensing / field reach",
    baseHz: CORE_FREQUENCY_HZ * 5,
    harmonic: 5,
    radius: 3.7,
    color: "#4cc9f0",
    baseNodes: 18,
  },
  {
    role: "threshold",
    label: "Threshold Band",
    description: "Boundary / return limit",
    baseHz: CORE_FREQUENCY_HZ * 6,
    harmonic: 6,
    radius: 4.8,
    color: "#386bff",
    baseNodes: 22,
  },
];

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function complexityToLevel(complexity: number) {
  return clamp(Math.round(complexity * 3.5), 1, 7);
}

export function getFieldDrive(frequency: number) {
  return clamp(frequency, 0.4, 4.2);
}

export function getCarrierFrequencyHz(frequency: number) {
  return CORE_FREQUENCY_HZ * getFieldDrive(frequency);
}

export function estimateLatticeNodeCount(complexity: number) {
  const level = complexityToLevel(complexity);
  return HARMONIC_SHELLS.reduce((total, shell) => total + shell.baseNodes * level, 0) - (level - 1);
}

const INTERFERENCE_BLUEPRINTS: Array<{
  role: HarmonicRole;
  azimuth: number;
  elevation: number;
  amplitudeScale: number;
  falloffScale: number;
}> = [
  { role: "core", azimuth: 0, elevation: 0, amplitudeScale: 1.15, falloffScale: 0.72 },
  { role: "mirror", azimuth: 0.25, elevation: 0.18, amplitudeScale: 0.82, falloffScale: 0.92 },
  { role: "mirror", azimuth: 1.2, elevation: -0.22, amplitudeScale: 0.8, falloffScale: 0.94 },
  { role: "triad", azimuth: 0.55, elevation: 0.35, amplitudeScale: 0.72, falloffScale: 1.0 },
  { role: "triad", azimuth: 1.75, elevation: -0.32, amplitudeScale: 0.7, falloffScale: 1.02 },
  { role: "triad", azimuth: 3.15, elevation: 0.12, amplitudeScale: 0.68, falloffScale: 1.04 },
  { role: "envelope", azimuth: 0.92, elevation: 0.4, amplitudeScale: 0.58, falloffScale: 1.1 },
  { role: "envelope", azimuth: 2.2, elevation: -0.42, amplitudeScale: 0.56, falloffScale: 1.12 },
  { role: "telemetry", azimuth: 1.45, elevation: 0.52, amplitudeScale: 0.42, falloffScale: 1.2 },
  { role: "threshold", azimuth: 2.9, elevation: -0.5, amplitudeScale: 0.34, falloffScale: 1.28 },
];

export const INTERFERENCE_EMITTER_COUNT = INTERFERENCE_BLUEPRINTS.length;

export function getInterferenceEmitters(time: number, frequency: number, complexity: number): InterferenceEmitter[] {
  const drive = getFieldDrive(frequency);
  const level = complexityToLevel(complexity);

  return INTERFERENCE_BLUEPRINTS.map((blueprint, index) => {
    const shell = HARMONIC_SHELLS.find((candidate) => candidate.role === blueprint.role) ?? HARMONIC_SHELLS[0];
    const shellRadius = shell.radius * 3.25 * (1 + (level - 1) * 0.015);
    const orbitRate = (0.055 + shell.harmonic * 0.013) * drive;
    const theta = blueprint.azimuth * Math.PI + time * orbitRate;
    const phi = blueprint.elevation + Math.sin(time * 0.21 + index * 0.9) * 0.16;
    const radial = shell.role === "core"
      ? 0
      : shellRadius * (1 + Math.sin(time * 0.14 + shell.harmonic * 0.43 + index) * 0.035);
    const x = radial * Math.cos(phi) * Math.cos(theta);
    const y = radial * Math.sin(phi);
    const z = radial * Math.cos(phi) * Math.sin(theta);

    return {
      id: `${shell.role}-${index}`,
      role: shell.role,
      harmonic: shell.harmonic,
      position: [x, y, z],
      amplitude: clamp((1 - (shell.harmonic - 1) * 0.12) * blueprint.amplitudeScale, 0.18, 1.2),
      falloff: 0.17 * blueprint.falloffScale + shell.harmonic * 0.035,
      visualFrequency: (0.34 + shell.harmonic * 0.17) * drive,
    };
  });
}
