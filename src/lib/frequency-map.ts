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
