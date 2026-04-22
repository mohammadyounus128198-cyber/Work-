import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Box, Camera, Shield, Zap } from "lucide-react";
import { LatticeScene } from "../components/3d/LatticeScene";
import { CommandInput } from "../components/CommandInput";
import { GlassHUD } from "../components/GlassHUD";
import { Notifications } from "../components/Notifications";
import { cn } from "@/src/lib/utils";
import { DEFAULT_PLATES, DEFAULT_TRANSITIONS, INFINITY_CORE, type PlateId } from "../lib/nonagram-codex";
import {
  CORE_CENTS_SHARP,
  CORE_FREQUENCY_HZ,
  CORE_PERIOD_MS,
  CORE_REFERENCE_NOTE,
  HARMONIC_SHELLS,
  clamp,
  complexityToLevel,
  estimateLatticeNodeCount,
  getCarrierFrequencyHz,
} from "../lib/frequency-map";

interface ResonanceParams {
  hue: number;
  speed: number;
  complexity: number;
  frequency: number;
}

interface LuminaWavePayload {
  freq: number;
  speed: number;
  complexity: number;
  hueShift: number;
  timestamp: number;
  source: string;
}

const STORAGE_KEY = "lumina-wave-params";
const LINK_SOURCE = "resonance-tuner";
const LINK_MAX_AGE_MS = 500;

function wrapHue(value: number) {
  return ((value % 360) + 360) % 360;
}

function mapToOmegaSpace(payload: LuminaWavePayload): ResonanceParams {
  return {
    hue: wrapHue(170 + payload.hueShift),
    speed: clamp(payload.speed ?? 1.0, 0.0, 2.5),
    complexity: clamp((payload.complexity ?? 3) / 3.5, 1 / 3.5, 2.0),
    frequency: clamp(payload.freq ?? 1.0, 0.4, 4.2),
  };
}

function normalizePayload(raw: string | null): LuminaWavePayload | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LuminaWavePayload>;
    const age = Date.now() - Number(parsed.timestamp);
    if (
      parsed.source !== LINK_SOURCE ||
      !Number.isFinite(parsed.timestamp) ||
      age < 0 ||
      age > LINK_MAX_AGE_MS
    ) {
      return null;
    }

    return {
      freq: clamp(Number(parsed.freq) || 1.0, 0.4, 4.2),
      speed: clamp(Number(parsed.speed) || 1.0, 0.0, 2.5),
      complexity: clamp(Math.round(Number(parsed.complexity) || 3), 1, 7),
      hueShift: clamp(Math.round(Number(parsed.hueShift) || 0), -180, 180),
      timestamp: Number(parsed.timestamp),
      source: parsed.source,
    };
  } catch {
    return null;
  }
}

export default function LatticePage() {
  const [resParams, setResParams] = useState<ResonanceParams>({
    hue: 170,
    speed: 1.0,
    complexity: 1.0,
    frequency: 1.0,
  });
  const [isSynced, setIsSynced] = useState(false);
  const [currentPlateIdx, setCurrentPlateIdx] = useState(0);
  const [lastLinkTimestamp, setLastLinkTimestamp] = useState(0);

  const lastAppliedTimestampRef = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPlateIdx((previous) => (previous + 1) % DEFAULT_PLATES.length);
    }, 2618);
    return () => clearInterval(timer);
  }, []);

  const activePlate = useMemo(() => DEFAULT_PLATES[currentPlateIdx], [currentPlateIdx]);
  const complexityLevel = useMemo(() => complexityToLevel(resParams.complexity), [resParams.complexity]);
  const latticeNodeCount = useMemo(() => estimateLatticeNodeCount(resParams.complexity), [resParams.complexity]);
  const carrierHz = useMemo(() => getCarrierFrequencyHz(resParams.frequency), [resParams.frequency]);
  const fieldRadius = useMemo(
    () => (HARMONIC_SHELLS[HARMONIC_SHELLS.length - 1]?.radius ?? 4.8) * (0.9 + resParams.frequency * 0.1),
    [resParams.frequency]
  );

  const shellTelemetry = useMemo(
    () =>
      HARMONIC_SHELLS.map((shell, index) => {
        const depth = 1 - index / Math.max(HARMONIC_SHELLS.length - 1, 1);
        const energy = clamp(depth * 72 + resParams.frequency * 7 + resParams.speed * 5, 18, 100);
        return {
          ...shell,
          energy,
        };
      }),
    [resParams.frequency, resParams.speed]
  );

  const applyLuminaPayload = useCallback((payload: LuminaWavePayload | null) => {
    if (!payload || payload.timestamp <= lastAppliedTimestampRef.current) {
      return;
    }

    lastAppliedTimestampRef.current = payload.timestamp;
    setResParams(mapToOmegaSpace(payload));
    setIsSynced(true);
    setLastLinkTimestamp(payload.timestamp);

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = setTimeout(() => {
      setIsSynced(false);
    }, LINK_MAX_AGE_MS + 100);
  }, []);

  useEffect(() => {
    const readAndApply = () => {
      if (document.visibilityState === "hidden") {
        return;
      }
      applyLuminaPayload(normalizePayload(window.localStorage.getItem(STORAGE_KEY)));
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) {
        return;
      }
      applyLuminaPayload(normalizePayload(event.newValue));
    };

    window.addEventListener("storage", handleStorage);
    const interval = window.setInterval(readAndApply, 100);
    readAndApply();

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.clearInterval(interval);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [applyLuminaPayload]);

  const handleManualCommand = useCallback((name: "freq" | "speed" | "complexity" | "hue", value: number) => {
    setIsSynced(false);
    setResParams((current) => {
      if (name === "freq") {
        return { ...current, frequency: clamp(value, 0.4, 4.2) };
      }
      if (name === "speed") {
        return { ...current, speed: clamp(value, 0.0, 2.5) };
      }
      if (name === "complexity") {
        return { ...current, complexity: clamp(value / 3.5, 1 / 3.5, 2.0) };
      }
      return { ...current, hue: wrapHue(170 + value) };
    });
  }, []);

  const captureScreen = useCallback(() => {
    const canvas = document.querySelector("canvas");
    if (!(canvas instanceof HTMLCanvasElement)) {
      return;
    }

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const ctx = tempCanvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.fillStyle = "#05070a";
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    ctx.drawImage(canvas, 0, 0);

    ctx.font = '12px "JetBrains Mono"';
    ctx.fillStyle = "#00f5d4";
    const metadata = [
      "CHORUS // RESONANCE_CAPTURE",
      `TIMESTAMP: ${new Date().toISOString()}`,
      `CORE: ${CORE_FREQUENCY_HZ.toFixed(2)} HZ`,
      `CARRIER: ${carrierHz.toFixed(2)} HZ`,
      `DRIVE: ${resParams.frequency.toFixed(2)}x`,
      `NODE_COUNT: ${latticeNodeCount}`,
      `COMPLEXITY: L${complexityLevel}`,
      `HUE: ${resParams.hue.toFixed(1)}`,
    ];

    metadata.forEach((text, index) => {
      ctx.fillText(text, 20, tempCanvas.height - 136 + index * 18);
    });

    ctx.strokeStyle = "#00f5d4";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, 10);
    ctx.lineTo(40, 10);
    ctx.moveTo(10, 10);
    ctx.lineTo(10, 40);
    ctx.stroke();

    const link = document.createElement("a");
    link.download = `chorus_resonance_${Date.now()}.png`;
    link.href = tempCanvas.toDataURL("image/png");
    link.click();
  }, [carrierHz, complexityLevel, latticeNodeCount, resParams.frequency, resParams.hue]);

  return (
    <main className="relative h-screen w-full overflow-hidden bg-chorus-bg select-none">
      <div className="lattice-bg" />
      <LatticeScene
        hue={resParams.hue}
        speed={resParams.speed}
        complexity={resParams.complexity}
        frequency={resParams.frequency}
      />
      <Notifications />

      <nav className="relative z-10 flex items-center justify-between px-8 py-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center border-2 border-chorus-primary rotate-45">
            <div className="h-4 w-4 -rotate-45 bg-chorus-primary" />
          </div>
          <div className="flex flex-col">
            <span className="glow-text text-2xl font-bold uppercase tracking-[0.2em] text-chorus-primary leading-none">Chorus</span>
            <span className="mt-1 text-[8px] font-mono italic tracking-[0.4em] text-chorus-primary/40">FREQUENCY_FIELD_SURFACE</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-[0.2em]"
        >
          <div
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1 transition-all duration-300",
              isSynced
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                : "border-white/10 bg-white/5 text-white/25"
            )}
          >
            <div
              className={cn(
                "h-1.5 w-1.5 rounded-full shadow-[0_0_8px]",
                isSynced ? "animate-pulse bg-emerald-400 shadow-emerald-400" : "bg-white/20"
              )}
            />
            <span>{isSynced ? "TUNER_LINKED" : "MANUAL_FIELD"}</span>
          </div>

          <div className="hidden items-center gap-2 text-cyan-400/70 lg:flex">
            <span className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
            <span>Carrier: {carrierHz.toFixed(2)}Hz</span>
          </div>

          <button
            onClick={captureScreen}
            className="group flex items-center gap-2 rounded border border-white/5 p-2 transition-all hover:bg-chorus-primary/10"
          >
            <Camera className="h-3 w-3 transition-transform group-hover:scale-110" />
            <span className="text-[9px]">RES_CAPTURE</span>
          </button>
        </motion.div>
      </nav>

      <section className="relative z-10 flex h-[calc(100vh-168px)] gap-6 px-8 pb-6">
        <div className="flex w-[20rem] shrink-0 flex-col gap-4">
          <GlassHUD title="Field Telemetry" delay={0.18} className="border-white/10">
            <div className="space-y-4 pt-2">
              {[
                { label: "Core Frequency", value: `${CORE_FREQUENCY_HZ.toFixed(2)} Hz`, percent: 100 },
                { label: "Carrier Output", value: `${carrierHz.toFixed(2)} Hz`, percent: (carrierHz / (CORE_FREQUENCY_HZ * 4.2)) * 100 },
                { label: "Shell Radius", value: `${fieldRadius.toFixed(1)} u`, percent: (fieldRadius / 5.5) * 100 },
                { label: "Node Count", value: `${latticeNodeCount}`, percent: (latticeNodeCount / 500) * 100 },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/50">{item.label}</span>
                    <span className="font-mono text-chorus-primary">{item.value}</span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${clamp(item.percent, 0, 100)}%` }}
                      className="h-full bg-chorus-primary shadow-[0_0_10px_rgba(0,245,212,0.35)]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassHUD>

          <GlassHUD title="Harmonic Intensity" delay={0.24} className="flex-1 border-white/10">
            <div className="flex h-full items-end gap-2 pt-6">
              {shellTelemetry.map((shell) => (
                <div key={shell.role} className="flex flex-1 flex-col items-center gap-2">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${shell.energy}%` }}
                    className="w-full rounded-t-md"
                    style={{
                      background: `linear-gradient(180deg, ${shell.color}, rgba(255,255,255,0.08))`,
                    }}
                  />
                  <div className="text-center">
                    <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-white/40">{shell.role}</div>
                    <div className="text-[9px] text-white/70">{shell.baseHz.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </GlassHUD>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-center">
          <div className="pointer-events-none flex w-full max-w-[42rem] flex-col items-center gap-6">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0, scale: 1 + (resParams.frequency - 1) * 0.03 }}
              transition={{ duration: 0.5 }}
              className="relative aspect-square w-full max-w-[30rem] overflow-hidden rounded-[2.75rem] border border-white/12 bg-black/30 shadow-[0_0_90px_rgba(0,0,0,0.45)] backdrop-blur-md"
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(circle at center, rgba(255,44,32,0.98) 0%, rgba(255,106,44,0.96) 17%, rgba(255,226,94,0.88) 33%, rgba(118,228,179,0.78) 52%, rgba(76,201,240,0.72) 70%, rgba(56,107,255,0.82) 100%)",
                }}
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18),transparent_52%)] mix-blend-screen" />
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:38px_38px]" />

              <motion.div
                animate={{
                  scale: 1 + resParams.speed * 0.035,
                  opacity: 0.28 + (resParams.frequency / 4.2) * 0.2,
                }}
                transition={{ duration: 1.8, repeat: Infinity, repeatType: "mirror" }}
                className="absolute inset-[18%] rounded-full border border-white/35 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2),transparent_70%)] shadow-[0_0_80px_rgba(255,130,60,0.3)]"
              />

              <motion.div
                animate={{ scale: 0.96 + (resParams.frequency / 4.2) * 0.18 }}
                transition={{ duration: 2.2, repeat: Infinity, repeatType: "mirror" }}
                className="absolute inset-[31%] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,40,30,0.98),rgba(255,110,44,0.7),transparent_74%)] blur-[2px]"
              />

              <div className="absolute left-5 top-5 rounded-full border border-white/20 bg-black/25 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.2em] text-white/75">
                Core Frequency Map
              </div>
              <div className="absolute bottom-5 left-5 max-w-[13rem] text-[10px] font-mono uppercase tracking-[0.18em] text-white/70">
                Single-node truth. Radial decay moves from coherent core to telemetry edge.
              </div>
            </motion.div>

            <div className="text-center">
              <div className="text-[11px] font-mono uppercase tracking-[0.46em] text-chorus-primary/70">Core Carrier</div>
              <div className="mt-2 text-6xl font-semibold tracking-tight text-white">{CORE_FREQUENCY_HZ.toFixed(2)} Hz</div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[11px] font-mono uppercase tracking-[0.18em] text-white/55">
                <span>Nearest note: {CORE_REFERENCE_NOTE}</span>
                <span>+{CORE_CENTS_SHARP} cents</span>
                <span>Period: {CORE_PERIOD_MS.toFixed(2)} ms</span>
              </div>
              <div className="mt-4 text-sm text-white/65">
                Carrier output is running at <span className="font-semibold text-white">{carrierHz.toFixed(2)} Hz</span> with
                {" "}
                <span className="font-semibold text-chorus-primary">{resParams.frequency.toFixed(2)}x</span> field drive.
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-[24rem] shrink-0 flex-col gap-4">
          <GlassHUD title="Frequency Shells" delay={0.3} className="border-white/10">
            <div className="space-y-3 pt-1">
              {HARMONIC_SHELLS.map((shell) => (
                <div key={shell.role} className="flex items-start gap-3">
                  <div
                    className="mt-1 h-2.5 w-2.5 rounded-full shadow-[0_0_12px_rgba(255,255,255,0.25)]"
                    style={{ backgroundColor: shell.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/40">{shell.label}</div>
                      <div className="text-[10px] font-mono text-chorus-primary">{shell.baseHz.toFixed(2)} Hz</div>
                    </div>
                    <div className="mt-1 text-xs text-white/65">{shell.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </GlassHUD>

          <div className="px-1 text-[10px] uppercase tracking-[0.2em] text-white/40">
            <div className="mb-2 flex items-center justify-between">
              <span>Nonagram Architecture</span>
              <span className="animate-pulse font-mono text-[8px] text-chorus-primary">SEALED</span>
            </div>

            <motion.div
              key={activePlate.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-lg border border-chorus-primary/20 bg-white/5 p-4 backdrop-blur-md"
            >
              <div className="absolute right-0 top-0 p-2 opacity-20">
                <Box className="h-8 w-8 text-chorus-primary" />
              </div>
              <div className="mb-1 text-[10px] font-mono text-chorus-primary">Plate {activePlate.id}</div>
              <div className="mb-1 text-sm font-bold uppercase tracking-widest text-white">{activePlate.name}</div>
              <div className="mb-3 text-[10px] text-white/50">{activePlate.role}</div>

              <div className="flex items-center gap-2">
                <div className="rounded border border-chorus-primary/20 bg-chorus-primary/10 px-1.5 py-0.5 text-[9px] font-mono text-chorus-primary">
                  {activePlate.stateType}
                </div>
                <div className="h-px flex-1 bg-white/10" />
                <div className="text-[9px] font-mono text-white/30">
                  -&gt; {DEFAULT_TRANSITIONS[activePlate.id as PlateId] === INFINITY_CORE ? "INF" : DEFAULT_TRANSITIONS[activePlate.id as PlateId]}
                </div>
              </div>
            </motion.div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {DEFAULT_PLATES.map((plate, index) => (
                <div
                  key={plate.id}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-500",
                    index === currentPlateIdx ? "bg-chorus-primary shadow-[0_0_8px_rgba(0,245,212,0.6)]" : "bg-white/10"
                  )}
                />
              ))}
            </div>
          </div>

          <GlassHUD title="Core Invariants" delay={0.38} className="flex-1 border-white/10">
            <div className="space-y-4 pt-2">
              {[
                { label: "PlateDomain", status: "VALID", icon: Shield },
                { label: "SealImmutable", status: "LOCKED", icon: Activity },
                { label: "InfinityReturn", status: "READY", icon: Zap },
              ].map((invariant) => (
                <div key={invariant.label} className="flex items-center gap-3">
                  <div className="rounded border border-white/10 bg-white/5 p-1.5">
                    <invariant.icon className="h-3 w-3 text-chorus-primary/75" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-mono uppercase text-white/40">{invariant.label}</div>
                    <div className="text-[10px] font-bold tracking-widest text-chorus-primary/85">{invariant.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </GlassHUD>
        </div>
      </section>

      <div className="relative z-20 flex justify-center px-4 pb-12">
        <CommandInput onCommand={handleManualCommand} onCapture={captureScreen} />
      </div>

      <div className="relative z-10 flex justify-between border-t border-white/5 bg-black/40 px-8 py-3 font-mono text-[9px] uppercase tracking-[0.4em] text-white/40 backdrop-blur-xl">
        <div className="flex gap-10">
          <span className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-chorus-primary" />
            Authority: Architect
          </span>
          <span className="hidden sm:inline">Last Sync: {lastLinkTimestamp ? new Date(lastLinkTimestamp).toLocaleTimeString() : "none"}</span>
        </div>
        <div className="flex gap-8">
          <span className="glow-text italic text-chorus-primary">Field: Stable</span>
          <span className="hidden sm:inline">Nodes: {latticeNodeCount}</span>
        </div>
      </div>
    </main>
  );
}
