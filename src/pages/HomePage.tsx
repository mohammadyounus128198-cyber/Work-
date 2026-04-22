import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Bookmark,
  LayoutDashboard,
  Monitor,
  Shield,
  ShieldAlert,
  Sparkles,
  Waves,
} from "lucide-react";
import { useCodex } from "../context/CodexContext";
import MeridianSurface from "../components/MeridianSurface";
import FuturePanel from "../components/FuturePanel";
import { StrategicAdvisor } from "../components/StrategicAdvisor";
import DigitalMirrorPanel from "../components/DigitalMirrorPanel";
import { useLuminaSync } from "../hooks/useLuminaSync";
import { config } from "../lib/config";

export default function HomePage() {
  const {
    data,
    meridian,
    alerts,
    isProcessing,
    lastSync,
    focusMode,
    setFocusMode,
    stabilizeSystem,
    lastEvaluation,
    phi,
    readiness,
    energy,
  } = useCodex();
  const luminaSync = useLuminaSync();

  return (
    <div className="min-h-screen bg-[#02050a] text-white">
      <header className="sticky top-0 z-50 border-b border-[#17313c] bg-[#03070ccc]/85 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-6 py-4 md:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#33e7ff33] bg-[#33e7ff12] text-[#33e7ff] glow-border">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="font-display text-lg font-black uppercase tracking-[0.44em] text-white md:text-xl">
                Chorus
              </div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-[#7e9ca9]">
                Digital Mirror Surface
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {(["SCAN", "FOCUS", "SIMULATE"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFocusMode(mode)}
                className={`rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.24em] transition-colors ${
                  focusMode === mode
                    ? "border-[#33e7ff55] bg-[#33e7ff15] text-white"
                    : "border-[#17313c] bg-[#071019] text-[#7e9ca9] hover:text-white"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.24em] text-[#7e9ca9]">
            <div className="flex items-center gap-2 rounded-full border border-[#17313c] bg-[#071019] px-3 py-2">
              <span className={`h-2 w-2 rounded-full ${isProcessing ? "bg-[#18ff9c] animate-pulse" : "bg-[#33e7ff]"}`} />
              {isProcessing ? "Processing" : "Stable"}
            </div>
            <div className="flex items-center gap-2 rounded-full border border-[#17313c] bg-[#071019] px-3 py-2">
              <Waves size={12} className={luminaSync.isSynced ? "text-[#18ff9c]" : "text-[#ffcb4c]"} />
              {luminaSync.isSynced ? "Resonance linked" : "Resonance idle"}
            </div>
            <div className="hidden rounded-full border border-[#17313c] bg-[#071019] px-3 py-2 md:block">
              Signals {data.length}
            </div>
          </div>
        </div>

        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-6 pb-4 md:px-8">
          <nav className="flex flex-wrap gap-2">
            <NavLink to="/" label="Surface" icon={<LayoutDashboard size={12} />} active />
            <NavLink to="/lattice" label="Lattice" icon={<Shield size={12} />} />
            <NavLink to="/console" label="Console" icon={<Monitor size={12} />} />
            <NavLink to="/codex" label="Codex" icon={<Bookmark size={12} />} />
          </nav>
          <div className="text-[10px] uppercase tracking-[0.24em] text-[#7e9ca9]">
            Last sync {lastSync || "Pending"}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 md:px-6 lg:px-8">
        <DigitalMirrorPanel
          meridian={meridian}
          evaluation={lastEvaluation}
          sync={luminaSync}
          isProcessing={isProcessing}
          focusMode={focusMode}
          dataCount={data.length}
          lastSync={lastSync}
          phi={phi}
          readiness={readiness}
          energy={energy}
          onStabilize={stabilizeSystem}
        />

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="overflow-hidden rounded-[1.7rem] border border-[#17313c] bg-[#05090fcc]">
            <MeridianSurface telemetry={meridian} mode={focusMode} />
          </div>

          <div className="grid gap-6">
            <SideCard
              title="Verification Rail"
              label={lastEvaluation?.consistency === "FAIL" ? "Consistency fault" : "Truth locked"}
              accent={lastEvaluation?.consistency === "FAIL" ? "text-[#ff4d64]" : "text-[#18ff9c]"}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <KeyValue label="Geometry" value={lastEvaluation?.geometryMode.replace(/_/g, " ") ?? "Pending"} />
                <KeyValue label="Facet" value={lastEvaluation?.activeFacet ?? "Pending"} />
                <KeyValue label="Attractor" value={lastEvaluation?.inPhiAttractor ? "G_phi" : "Open"} />
                <KeyValue label="Envelope" value={lastEvaluation ? `${lastEvaluation.W.toFixed(1)} / ${lastEvaluation.M_min}` : "--"} />
              </div>
            </SideCard>

            <SideCard title="Operational Focus" label="Live operator stance" accent="text-[#33e7ff]">
              <div className="space-y-4 text-sm text-[#a5c0cb]">
                <p>
                  Risk tolerance is set to <span className="text-white">{config.riskTolerance.toFixed(2)}</span> and
                  alert sensitivity is <span className="text-white">{config.alertSensitivity.toFixed(2)}</span>.
                </p>
                <div className="flex flex-wrap gap-2">
                  {config.focus.map((entry) => (
                    <span
                      key={entry}
                      className="rounded-full border border-[#17313c] bg-[#071019] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[#7e9ca9]"
                    >
                      {entry}
                    </span>
                  ))}
                </div>
              </div>
            </SideCard>

            <div className="rounded-[1.7rem] border border-[#17313c] bg-[#05090fcc] p-5 md:p-6">
              <StrategicAdvisor />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.7rem] border border-[#17313c] bg-[#05090fcc] p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#17313c] pb-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.28em] text-[#7e9ca9]">Strategic Operational Feed</div>
                <div className="mt-2 text-sm text-[#a5c0cb]">
                  Live signal flow, surfaced instead of hidden.
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-[#17313c] bg-[#071019] px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-[#7e9ca9]">
                <Activity size={12} className="text-[#33e7ff]" />
                {data.length} live signals
              </div>
            </div>
            <FuturePanel data={data} />
          </div>

          <div className="grid gap-6">
            <SideCard
              title="Alert Stream"
              label={alerts.length > 0 ? "Pressure detected" : "System calm"}
              accent={alerts.length > 0 ? "text-[#ff4d64]" : "text-[#18ff9c]"}
            >
              {alerts.length > 0 ? (
                <div className="space-y-3">
                  {alerts.slice(0, 4).map((alert, index) => (
                    <div
                      key={`${alert}-${index}`}
                      className="rounded-[1.2rem] border border-[#ff4d642a] bg-[#16080d] px-4 py-3 text-sm text-[#ffd7dd]"
                    >
                      <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#ff8a9a]">
                        <ShieldAlert size={12} />
                        alert
                      </div>
                      {alert}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.2rem] border border-[#17313c] bg-[#071019] px-4 py-4 text-sm text-[#a5c0cb]">
                  No current alert bursts. The mirror is reading a stable buffer.
                </div>
              )}
            </SideCard>

            <SideCard title="Direct Actions" label="Fast operator hops" accent="text-[#ffcb4c]">
              <div className="grid gap-3">
                <ActionLink to="/lattice" title="Open lattice field" note="Inspect the reactive 3D surface and node focus." />
                <ActionLink to="/console" title="Audit the console" note="Review traces, guardrails, and system history." />
                <button
                  onClick={stabilizeSystem}
                  className="rounded-[1.2rem] border border-[#18ff9c33] bg-[#18ff9c12] px-4 py-4 text-left transition-colors hover:bg-[#18ff9c1b]"
                >
                  <div className="text-[10px] uppercase tracking-[0.22em] text-[#18ff9c]">Stabilize field</div>
                  <div className="mt-2 text-sm text-[#d8fff0]">Push a corrective pulse through the runtime lattice.</div>
                </button>
              </div>
            </SideCard>
          </div>
        </section>
      </main>
    </div>
  );
}

function NavLink({
  to,
  label,
  icon,
  active = false,
}: {
  to: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] transition-colors ${
        active
          ? "border-[#33e7ff44] bg-[#33e7ff15] text-white"
          : "border-[#17313c] bg-[#071019] text-[#7e9ca9] hover:text-white"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function SideCard({
  title,
  label,
  accent,
  children,
}: {
  title: string;
  label: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[1.7rem] border border-[#17313c] bg-[#05090fcc] p-5 md:p-6">
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-[#17313c] pb-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] text-[#7e9ca9]">{title}</div>
          <div className={`mt-2 text-sm font-semibold ${accent}`}>{label}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-[#17313c] bg-[#071019] px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.22em] text-[#7e9ca9]">{label}</div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function ActionLink({ to, title, note }: { to: string; title: string; note: string }) {
  return (
    <Link
      to={to}
      className="rounded-[1.2rem] border border-[#17313c] bg-[#071019] px-4 py-4 transition-colors hover:border-[#33e7ff33]"
    >
      <div className="text-[10px] uppercase tracking-[0.22em] text-[#33e7ff]">{title}</div>
      <div className="mt-2 text-sm text-[#a5c0cb]">{note}</div>
    </Link>
  );
}
