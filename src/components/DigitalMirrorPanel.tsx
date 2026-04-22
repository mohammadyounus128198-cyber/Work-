import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  AudioLines,
  Cpu,
  Radar,
  ShieldCheck,
  Sparkles,
  Waves,
} from "lucide-react";
import type { EnvelopeEvaluation, MeridianTelemetry } from "../lib/types";
import type { LuminaSyncState } from "../hooks/useLuminaSync";

interface DigitalMirrorPanelProps {
  meridian: MeridianTelemetry | null;
  evaluation: EnvelopeEvaluation | null;
  sync: LuminaSyncState;
  isProcessing: boolean;
  focusMode: "SCAN" | "FOCUS" | "SIMULATE";
  dataCount: number;
  lastSync: string;
  phi: number;
  readiness: number;
  energy: number;
  onStabilize: () => void;
}

function buildMirrorReflection(
  meridian: MeridianTelemetry | null,
  evaluation: EnvelopeEvaluation | null,
  sync: LuminaSyncState,
  focusMode: "SCAN" | "FOCUS" | "SIMULATE",
  dataCount: number,
) {
  if (!meridian) {
    return "The mirror is warming its field. Telemetry is present, but the reflective layer is still gathering coherence.";
  }

  const vitality = meridian.vitalityIndex.toFixed(1);
  const momentum = meridian.operationalMomentum.toFixed(1);
  const anomaly = meridian.anomalyPressure.toFixed(1);
  const facet = evaluation?.activeFacet ?? "Facet-A";
  const attractor = evaluation?.inPhiAttractor ? "inside G_phi" : "outside G_phi";
  const link = sync.isSynced && sync.params
    ? `The DAN-Omega bridge is live at hue ${Math.round(sync.params.hue)} with frequency ${sync.params.frequency.toFixed(2)}.`
    : "The resonance bridge is idle, so the lattice is holding its native cadence.";

  return `The mirror sees ${dataCount} active signals in ${focusMode.toLowerCase()} mode. Vitality is ${vitality}, momentum is ${momentum}, anomaly pressure is ${anomaly}, and the control front is leaning on ${facet}, ${attractor}. ${link}`;
}

function buildPromptFallback(prompt: string, baseReflection: string) {
  if (!prompt.trim()) {
    return baseReflection;
  }

  return `${baseReflection} Asked through the mirror: "${prompt.trim()}". The guidance is to keep the surface honest, stabilize pressure before acceleration, and move deeper only when the signal remains coherent across the next cycle.`;
}

export default function DigitalMirrorPanel({
  meridian,
  evaluation,
  sync,
  isProcessing,
  focusMode,
  dataCount,
  lastSync,
  phi,
  readiness,
  energy,
  onStabilize,
}: DigitalMirrorPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [reflection, setReflection] = useState("");
  const [isReflecting, setIsReflecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseReflection = useMemo(
    () => buildMirrorReflection(meridian, evaluation, sync, focusMode, dataCount),
    [meridian, evaluation, sync, focusMode, dataCount],
  );

  useEffect(() => {
    if (!isReflecting && !prompt.trim()) {
      setReflection(baseReflection);
    }
  }, [baseReflection, isReflecting, prompt]);

  const handleReflect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsReflecting(true);
    setError(null);

    try {
      const response = await fetch("/api/oracle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          metrics: meridian
            ? {
                SVI: meridian.vitalityIndex,
                OM: meridian.operationalMomentum,
                AP: meridian.anomalyPressure,
                phi,
                readiness,
                energy,
                mode: focusMode,
              }
            : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Mirror request failed with ${response.status}`);
      }

      const contentType = response.headers.get("content-type") ?? "";
      let nextReflection = "";

      if (contentType.includes("application/json")) {
        const payload = await response.json();
        nextReflection = typeof payload.text === "string"
          ? payload.text
          : buildPromptFallback(prompt, baseReflection);
      } else {
        nextReflection = await response.text();
      }

      setReflection(nextReflection.trim() || buildPromptFallback(prompt, baseReflection));
    } catch (fetchError) {
      console.error("[DIGITAL_MIRROR_ERR]", fetchError);
      setError("External oracle link unavailable. Falling back to the live runtime reflection.");
      setReflection(buildPromptFallback(prompt, baseReflection));
    } finally {
      setIsReflecting(false);
    }
  };

  const stats = [
    {
      label: "Link",
      value: sync.isSynced ? "Secure" : "Idle",
      accent: sync.isSynced ? "text-[#18ff9c]" : "text-[#ffcb4c]",
      icon: <Waves size={14} />,
    },
    {
      label: "Facet",
      value: evaluation?.activeFacet ?? "Awaiting",
      accent: "text-[#33e7ff]",
      icon: <Radar size={14} />,
    },
    {
      label: "Attractor",
      value: evaluation?.inPhiAttractor ? "G_phi" : "Open",
      accent: evaluation?.inPhiAttractor ? "text-[#18ff9c]" : "text-[#7e9ca9]",
      icon: <ShieldCheck size={14} />,
    },
    {
      label: "Last sync",
      value: lastSync || "Pending",
      accent: "text-[#ffcb4c]",
      icon: <Cpu size={14} />,
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[#17313c] bg-[linear-gradient(145deg,rgba(4,11,18,0.96),rgba(5,9,14,0.84))] px-6 py-8 md:px-10 md:py-10 lg:px-12 lg:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(51,231,255,0.14),transparent_30%),radial-gradient(circle_at_82%_22%,rgba(255,203,76,0.12),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_24%)]" />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-10%] top-[-18%] h-[32rem] w-[32rem] rounded-full border border-[#33e7ff22]"
        animate={{ rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      />
      <div className="pointer-events-none absolute inset-x-8 top-8 h-px bg-gradient-to-r from-transparent via-[#33e7ff44] to-transparent" />

      <div className="relative z-10 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
        <div className="flex flex-col justify-between gap-8">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.32em] text-[#7e9ca9]">
              <span className="rounded-full border border-[#33e7ff22] bg-[#33e7ff0d] px-3 py-1 text-[#33e7ff]">
                Digital Mirror
              </span>
              <span className="rounded-full border border-[#18ff9c22] bg-[#18ff9c0d] px-3 py-1 text-[#18ff9c]">
                {sync.isSynced ? "DAN-Omega Live" : "Standalone Reflection"}
              </span>
            </div>

            <div className="max-w-2xl space-y-4">
              <h1 className="font-display text-5xl font-black uppercase leading-[0.92] tracking-[0.08em] text-white md:text-6xl xl:text-7xl">
                Digital
                <span className="block text-[#33e7ff] glow-text">Mirror Oracle</span>
              </h1>
              <p className="max-w-xl text-base leading-7 text-[#9db7c3] md:text-lg">
                The surface now reflects live state instead of hiding it. Oracle evaluation, runtime pressure,
                attractor status, and external resonance are all readable from the first viewport.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-[1.3rem] border border-[#17313c] bg-[#040911cc] px-4 py-4 backdrop-blur-xl"
              >
                <div className={`mb-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] ${stat.accent}`}>
                  {stat.icon}
                  {stat.label}
                </div>
                <div className="text-lg font-semibold text-white">{stat.value}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/lattice"
              className="inline-flex items-center gap-2 rounded-full border border-[#33e7ff44] bg-[#33e7ff14] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.24em] text-[#d9fbff] transition-colors hover:bg-[#33e7ff22]"
            >
              Open Lattice
              <ArrowRight size={14} />
            </Link>
            <Link
              to="/console"
              className="inline-flex items-center gap-2 rounded-full border border-[#17313c] bg-[#071019] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.24em] text-[#9db7c3] transition-colors hover:border-[#33e7ff33] hover:text-white"
            >
              Audit Console
            </Link>
            <button
              onClick={onStabilize}
              className="inline-flex items-center gap-2 rounded-full border border-[#18ff9c33] bg-[#18ff9c12] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.24em] text-[#cffff0] transition-colors hover:bg-[#18ff9c1e]"
            >
              Stabilize Field
            </button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_50%_34%,rgba(51,231,255,0.18),transparent_30%),radial-gradient(circle_at_50%_68%,rgba(173,222,255,0.1),transparent_36%)] blur-2xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-[#33e7ff2a] bg-[linear-gradient(180deg,rgba(10,18,29,0.96),rgba(4,9,14,0.92))] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.45)] md:p-7">
            <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(180deg,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.04)_1px,transparent_1px,transparent_5px)] opacity-20" />
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-[18%] h-56 w-56 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(51,231,255,0.2),rgba(51,231,255,0.04),transparent_68%)]"
              animate={{
                scale: sync.isSynced ? [1, 1.08, 1] : [1, 1.03, 1],
                opacity: isProcessing ? [0.55, 0.9, 0.55] : [0.45, 0.7, 0.45],
              }}
              transition={{ duration: sync.isSynced ? 2.2 : 3.6, repeat: Infinity }}
            />

            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.32em] text-[#7e9ca9]">Reflection Surface</div>
                  <div className="mt-2 text-sm font-semibold uppercase tracking-[0.24em] text-white">
                    {evaluation?.facetLabel ?? "Oracle handshake pending"}
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-[#17313c] bg-[#071019] px-3 py-1.5 text-[10px] uppercase tracking-[0.24em]">
                  <span className={`h-2 w-2 rounded-full ${sync.isSynced ? "bg-[#18ff9c]" : "bg-[#ffcb4c]"}`} />
                  <span className={sync.isSynced ? "text-[#18ff9c]" : "text-[#ffcb4c]"}>
                    {sync.isSynced ? "Linked" : "Native"}
                  </span>
                </div>
              </div>

              <div className="min-h-[18rem] rounded-[1.6rem] border border-[#17313c] bg-[linear-gradient(180deg,rgba(5,12,18,0.86),rgba(2,7,11,0.94))] p-5 md:p-6">
                <div className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-[#33e7ff]">
                  <Sparkles size={14} />
                  Oracle reflection
                </div>
                <div className="max-h-[14rem] overflow-auto pr-1 text-[15px] leading-7 text-[#d4e9f0]">
                  {isReflecting ? (
                    <div className="space-y-3">
                      <div className="h-3 w-32 rounded-full bg-[#33e7ff22]" />
                      <div className="h-3 w-full rounded-full bg-[#17313c]" />
                      <div className="h-3 w-[88%] rounded-full bg-[#17313c]" />
                      <div className="h-3 w-[72%] rounded-full bg-[#17313c]" />
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{reflection}</p>
                  )}
                </div>
              </div>

              <form className="space-y-3" onSubmit={handleReflect}>
                <label className="block text-[10px] uppercase tracking-[0.28em] text-[#7e9ca9]">
                  Ask the mirror
                </label>
                <div className="flex flex-col gap-3 md:flex-row">
                  <input
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="Where is the system bending next?"
                    className="min-w-0 flex-1 rounded-full border border-[#17313c] bg-[#050b12] px-5 py-3 text-sm text-white outline-none transition-colors placeholder:text-[#39505d] focus:border-[#33e7ff44]"
                  />
                  <button
                    type="submit"
                    disabled={isReflecting}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[#33e7ff44] bg-[#33e7ff14] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.24em] text-[#d9fbff] transition-colors hover:bg-[#33e7ff22] disabled:opacity-60"
                  >
                    <AudioLines size={14} />
                    {isReflecting ? "Reflecting" : "Reflect"}
                  </button>
                </div>
                {error && <div className="text-[11px] text-[#ffcb4c]">{error}</div>}
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
