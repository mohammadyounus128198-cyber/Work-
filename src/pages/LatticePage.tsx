import { motion, AnimatePresence } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Bell, BellOff, Box, Camera, Shield, Zap } from "lucide-react";
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
  const [notificationsVisible, setNotificationsVisible] = useState(true);
  const [tick, setTick] = useState(0);

  const lastAppliedTimestampRef = useRef(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPlateIdx((previous) => (previous + 1) % DEFAULT_PLATES.length);
    }, 2618);
    return () => clearInterval(timer);
  }, []);

  // Tick for live clock
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
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

  const nowStr = useMemo(() => {
    void tick;
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }, [tick]);

  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#030507] select-none font-mono">
      {/* Background grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse 70% 55% at 50% 40%, rgba(0,245,212,0.055) 0%, transparent 70%),
            linear-gradient(rgba(0,245,212,0.028) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,245,212,0.028) 1px, transparent 1px)
          `,
          backgroundSize: "auto, 56px 56px, 56px 56px",
        }}
      />

      {/* 3D field */}
      <LatticeScene
        hue={resParams.hue}
        speed={resParams.speed}
        complexity={resParams.complexity}
        frequency={resParams.frequency}
      />

      {/* Notifications */}
      <Notifications
        visible={notificationsVisible}
        className="right-6 top-[5.5rem] w-[min(22rem,calc(100vw-2rem))] md:right-8"
      />

      {/* ── NAV ── */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-black/50 backdrop-blur-xl">
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3"
        >
          {/* Corner-bracket logo */}
          <div className="relative h-9 w-9 shrink-0">
            <span className="absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-chorus-primary" />
            <span className="absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2 border-chorus-primary" />
            <span className="absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-chorus-primary" />
            <span className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-chorus-primary" />
            <div className="absolute inset-2 flex items-center justify-center">
              <div className="h-2 w-2 rounded-sm bg-chorus-primary shadow-[0_0_8px_rgba(0,245,212,0.7)]" />
            </div>
          </div>
          <div>
            <div className="text-[15px] font-bold uppercase tracking-[0.36em] text-white leading-none">Chorus</div>
            <div className="mt-0.5 text-[8px] tracking-[0.42em] text-chorus-primary/50 uppercase">
              Frequency Field Surface
            </div>
          </div>
        </motion.div>

        {/* Center: live freq readout */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="hidden lg:flex items-center gap-6"
        >
          <NavStat label="Core" value={`${CORE_FREQUENCY_HZ.toFixed(2)} Hz`} accent="text-chorus-primary" />
          <div className="h-6 w-px bg-white/10" />
          <NavStat label="Carrier" value={`${carrierHz.toFixed(2)} Hz`} accent="text-sky-400" />
          <div className="h-6 w-px bg-white/10" />
          <NavStat label="Drive" value={`${resParams.frequency.toFixed(2)}×`} accent="text-amber-400" />
          <div className="h-6 w-px bg-white/10" />
          <NavStat label="Nodes" value={String(latticeNodeCount)} accent="text-white/70" />
        </motion.div>

        {/* Right: controls */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          role="toolbar"
          aria-label="Scene controls"
          className="flex items-center gap-2"
        >
          {/* Sync badge */}
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[9px] uppercase tracking-[0.22em] transition-all duration-300 border",
              isSynced
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-white/8 bg-white/4 text-white/30"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isSynced ? "animate-pulse bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-white/20"
              )}
            />
            {isSynced ? "Linked" : "Manual"}
          </div>

          <NavButton
            onClick={() => setNotificationsVisible((c) => !c)}
            ariaLabel={notificationsVisible ? "Hide activity feed" : "Show activity feed"}
            ariaPressed={notificationsVisible}
          >
            {notificationsVisible ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
            <span className="text-[9px] uppercase tracking-[0.2em]">{notificationsVisible ? "Feed" : "Hidden"}</span>
          </NavButton>

          <NavButton onClick={captureScreen} ariaLabel="Capture resonance field as PNG">
            <Camera className="h-3.5 w-3.5" />
            <span className="text-[9px] uppercase tracking-[0.2em]">Capture</span>
          </NavButton>
        </motion.div>
      </nav>

      {/* ── MAIN GRID ── */}
      <section className="relative z-10 grid h-[calc(100vh-48px-56px)] grid-cols-[18rem_1fr_22rem] gap-0">

        {/* LEFT PANEL */}
        <aside className="flex flex-col gap-3 border-r border-white/[0.06] bg-black/30 backdrop-blur-sm p-4 overflow-auto">

          {/* Field Telemetry */}
          <PanelBlock title="Field Telemetry" accent="cyan">
            <div className="space-y-3 pt-1">
              {[
                { label: "Core Freq", value: `${CORE_FREQUENCY_HZ.toFixed(2)} Hz`, pct: 100, color: "#00f5d4" },
                { label: "Carrier Out", value: `${carrierHz.toFixed(2)} Hz`, pct: (carrierHz / (CORE_FREQUENCY_HZ * 4.2)) * 100, color: "#38bdf8" },
                { label: "Shell Radius", value: `${fieldRadius.toFixed(1)} u`, pct: (fieldRadius / 5.5) * 100, color: "#a78bfa" },
                { label: "Node Count", value: String(latticeNodeCount), pct: (latticeNodeCount / 500) * 100, color: "#fbbf24" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-[10px] mb-1.5">
                    <span className="text-white/45">{item.label}</span>
                    <span style={{ color: item.color }}>{item.value}</span>
                  </div>
                  <div className="h-0.5 w-full rounded-full bg-white/8 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${clamp(item.pct, 0, 100)}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: item.color, boxShadow: `0 0 8px ${item.color}66` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </PanelBlock>

          {/* Harmonic Intensity */}
          <PanelBlock title="Harmonic Intensity" accent="amber" className="flex-1 min-h-0">
            <div className="flex h-full items-end gap-1.5 pt-4 pb-1">
              {shellTelemetry.map((shell) => (
                <div key={shell.role} className="flex flex-1 flex-col items-center gap-2">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${shell.energy}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="w-full rounded-t-sm"
                    style={{
                      background: `linear-gradient(180deg, ${shell.color} 0%, ${shell.color}22 100%)`,
                      boxShadow: `0 0 12px ${shell.color}44`,
                    }}
                  />
                  <div className="text-center">
                    <div className="text-[8px] uppercase tracking-widest text-white/30">{shell.role}</div>
                    <div className="text-[8px] text-white/55">{shell.baseHz.toFixed(1)}</div>
                  </div>
                </div>
              ))}
            </div>
          </PanelBlock>
        </aside>

        {/* CENTER: 3D canvas area + freq readout */}
        <div className="flex flex-col items-center justify-between py-6 px-4 overflow-hidden">

          {/* Center freq card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex flex-col items-center text-center"
          >
            <div className="text-[10px] uppercase tracking-[0.46em] text-chorus-primary/60 mb-1">Core Carrier</div>
            <div className="text-5xl font-semibold tracking-tight text-white tabular-nums">
              {CORE_FREQUENCY_HZ.toFixed(2)}{" "}
              <span className="text-2xl text-white/40">Hz</span>
            </div>
            <div className="mt-2 flex items-center gap-4 text-[10px] uppercase tracking-[0.2em] text-white/40">
              <span>{CORE_REFERENCE_NOTE}</span>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>+{CORE_CENTS_SHARP} ¢</span>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>{CORE_PERIOD_MS.toFixed(2)} ms</span>
            </div>
          </motion.div>

          {/* Central freq map orb */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 + (resParams.frequency - 1) * 0.025 }}
            transition={{ duration: 0.6 }}
            className="relative aspect-square w-full max-w-[22rem] overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.6)] bg-black/40"
          >
            {/* Spectrum fill */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at center, rgba(255,44,32,0.95) 0%, rgba(255,106,44,0.9) 18%, rgba(255,226,94,0.82) 35%, rgba(118,228,179,0.72) 54%, rgba(76,201,240,0.68) 70%, rgba(56,107,255,0.78) 100%)",
              }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.14),transparent_50%)] mix-blend-screen" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:32px_32px]" />

            {/* Pulsing ring */}
            <motion.div
              animate={{ scale: 1 + resParams.speed * 0.04, opacity: 0.25 + (resParams.frequency / 4.2) * 0.22 }}
              transition={{ duration: 2, repeat: Infinity, repeatType: "mirror" }}
              className="absolute inset-[16%] rounded-full border border-white/30 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18),transparent_65%)]"
            />
            {/* Inner core */}
            <motion.div
              animate={{ scale: 0.94 + (resParams.frequency / 4.2) * 0.2 }}
              transition={{ duration: 2.4, repeat: Infinity, repeatType: "mirror" }}
              className="absolute inset-[30%] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,40,30,0.98),rgba(255,110,44,0.6),transparent_72%)] blur-sm"
            />

            {/* Corner bracket decorations */}
            <span className="absolute left-4 top-4 h-4 w-4 border-l-2 border-t-2 border-white/30" />
            <span className="absolute right-4 top-4 h-4 w-4 border-r-2 border-t-2 border-white/30" />
            <span className="absolute bottom-4 left-4 h-4 w-4 border-b-2 border-l-2 border-white/30" />
            <span className="absolute bottom-4 right-4 h-4 w-4 border-b-2 border-r-2 border-white/30" />

            <div className="absolute left-3 top-3 rounded-sm border border-white/15 bg-black/30 px-2 py-1 text-[9px] uppercase tracking-[0.22em] text-white/60 backdrop-blur-sm">
              Core Frequency Map
            </div>
            <div className="absolute bottom-3 left-3 max-w-[11rem] text-[9px] uppercase tracking-[0.14em] text-white/50">
              Radial decay · coherent core
            </div>
          </motion.div>

          {/* Bottom carrier line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center text-[12px] text-white/50"
          >
            Carrier{" "}
            <span className="text-white font-semibold">{carrierHz.toFixed(2)} Hz</span>
            {"  ·  "}
            <span className="text-chorus-primary font-semibold">{resParams.frequency.toFixed(2)}×</span>
            {" field drive"}
          </motion.div>
        </div>

        {/* RIGHT PANEL */}
        <aside className="flex flex-col gap-3 border-l border-white/[0.06] bg-black/30 backdrop-blur-sm p-4 overflow-auto">

          {/* Frequency Shells */}
          <PanelBlock title="Frequency Shells" accent="violet">
            <div className="space-y-3 pt-1">
              {HARMONIC_SHELLS.map((shell) => (
                <div key={shell.role} className="flex items-start gap-2.5">
                  <div
                    className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: shell.color, boxShadow: `0 0 8px ${shell.color}88` }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <div className="text-[9px] uppercase tracking-[0.18em] text-white/35">{shell.label}</div>
                      <div className="text-[9px] tabular-nums" style={{ color: shell.color }}>{shell.baseHz.toFixed(2)} Hz</div>
                    </div>
                    <div className="text-[10px] text-white/55 leading-relaxed">{shell.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </PanelBlock>

          {/* Nonagram Plate */}
          <PanelBlock title="Nonagram Architecture" accent="cyan">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePlate.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="relative overflow-hidden rounded border border-chorus-primary/15 bg-white/[0.04] p-3"
              >
                <div className="absolute right-2 top-2 opacity-15">
                  <Box className="h-7 w-7 text-chorus-primary" />
                </div>
                <div className="mb-0.5 text-[9px] text-chorus-primary">Plate {activePlate.id}</div>
                <div className="mb-0.5 text-[11px] font-bold uppercase tracking-widest text-white">{activePlate.name}</div>
                <div className="mb-2.5 text-[9px] text-white/40">{activePlate.role}</div>
                <div className="flex items-center gap-2">
                  <div className="rounded border border-chorus-primary/20 bg-chorus-primary/10 px-1.5 py-0.5 text-[9px] text-chorus-primary">
                    {activePlate.stateType}
                  </div>
                  <div className="h-px flex-1 bg-white/10" />
                  <div className="text-[9px] text-white/30">
                    {"->"} {DEFAULT_TRANSITIONS[activePlate.id as PlateId] === INFINITY_CORE ? "INF" : DEFAULT_TRANSITIONS[activePlate.id as PlateId]}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Plate progress dots */}
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {DEFAULT_PLATES.map((plate, index) => (
                <div
                  key={plate.id}
                  className={cn(
                    "h-1 rounded-full transition-all duration-500",
                    index === currentPlateIdx
                      ? "bg-chorus-primary shadow-[0_0_6px_rgba(0,245,212,0.6)]"
                      : "bg-white/10"
                  )}
                />
              ))}
            </div>
          </PanelBlock>

          {/* Core Invariants */}
          <PanelBlock title="Core Invariants" accent="emerald" className="flex-1">
            <div className="space-y-3 pt-1">
              {[
                { label: "PlateDomain", status: "VALID", icon: Shield, color: "#00f5d4" },
                { label: "SealImmutable", status: "LOCKED", icon: Activity, color: "#fbbf24" },
                { label: "InfinityReturn", status: "READY", icon: Zap, color: "#a78bfa" },
              ].map((invariant) => (
                <div key={invariant.label} className="flex items-center gap-2.5">
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-white/10 bg-white/[0.06]"
                    style={{ boxShadow: `inset 0 0 6px ${invariant.color}22` }}
                  >
                    <invariant.icon className="h-3 w-3" style={{ color: invariant.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="text-[9px] uppercase text-white/35">{invariant.label}</div>
                    <div className="text-[10px] font-bold tracking-widest" style={{ color: invariant.color }}>{invariant.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </PanelBlock>
        </aside>
      </section>

      {/* ── COMMAND BAR ── */}
      <div className="relative z-20 flex justify-center border-t border-white/[0.06] bg-black/60 backdrop-blur-xl px-4 py-2">
        <CommandInput onCommand={handleManualCommand} onCapture={captureScreen} />
      </div>

      {/* ── STATUS FOOTER ── */}
      <footer className="relative z-20 flex items-center justify-between border-t border-white/[0.05] bg-black/70 px-8 py-2 font-mono text-[9px] uppercase tracking-[0.36em] text-white/30 backdrop-blur-xl">
        <div className="flex items-center gap-8">
          <StatusPill color="#00f5d4">Authority: Architect</StatusPill>
          <span className="hidden sm:inline">
            Last sync: {lastLinkTimestamp ? new Date(lastLinkTimestamp).toLocaleTimeString() : "none"}
          </span>
        </div>
        <div className="flex items-center gap-8">
          <span className="tabular-nums text-white/25">{nowStr}</span>
          <StatusPill color="#00f5d4" glow>Field: Stable</StatusPill>
          <span className="hidden sm:inline">Nodes: {latticeNodeCount}</span>
        </div>
      </footer>
    </main>
  );
}

// ── Sub-components ──

function NavStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="text-center">
      <div className="text-[8px] uppercase tracking-[0.34em] text-white/30">{label}</div>
      <div className={cn("text-[12px] tabular-nums font-semibold mt-0.5", accent)}>{value}</div>
    </div>
  );
}

function NavButton({
  onClick,
  ariaLabel,
  ariaPressed,
  children,
}: {
  onClick: () => void;
  ariaLabel: string;
  ariaPressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ariaPressed}
      aria-label={ariaLabel}
      className="flex min-h-8 items-center gap-1.5 rounded border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-white/60 transition-all hover:border-chorus-primary/40 hover:bg-chorus-primary/8 hover:text-chorus-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-chorus-primary/50"
    >
      {children}
    </button>
  );
}

function PanelBlock({
  title,
  accent,
  children,
  className,
}: {
  title: string;
  accent: "cyan" | "amber" | "violet" | "emerald";
  children: React.ReactNode;
  className?: string;
}) {
  const accentClass = {
    cyan: "text-chorus-primary",
    amber: "text-amber-400",
    violet: "text-violet-400",
    emerald: "text-emerald-400",
  }[accent];

  const dotClass = {
    cyan: "bg-chorus-primary shadow-[0_0_6px_rgba(0,245,212,0.7)]",
    amber: "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]",
    violet: "bg-violet-400 shadow-[0_0_6px_rgba(167,139,250,0.7)]",
    emerald: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]",
  }[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        "flex flex-col rounded border border-white/[0.07] bg-white/[0.03] p-3 backdrop-blur-sm",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/[0.07]">
        <h3 className={cn("text-[9px] font-bold uppercase tracking-[0.28em]", accentClass)}>{title}</h3>
        <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", dotClass)} />
      </div>
      <div className="flex-1 min-h-0 overflow-auto">{children}</div>
    </motion.div>
  );
}

function StatusPill({ color, glow = false, children }: { color: string; glow?: boolean; children: React.ReactNode }) {
  return (
    <span
      className="flex items-center gap-1.5"
      style={glow ? { color, textShadow: `0 0 8px ${color}88` } : { color }}
    >
      <span
        className="h-1 w-1 rounded-full"
        style={{ backgroundColor: color, boxShadow: glow ? `0 0 6px ${color}` : undefined }}
      />
      {children}
    </span>
  );
}
