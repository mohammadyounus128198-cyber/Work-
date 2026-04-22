import { motion } from "motion/react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";

type CommandName = "freq" | "speed" | "complexity" | "hue";

interface CommandInputProps {
  onCommand: (name: CommandName, value: number) => void;
  onCapture: () => void;
}

interface ValidationRule {
  label: string;
  min: number;
  max: number;
  integer?: boolean;
}

const COMMAND_RULES: Record<CommandName, ValidationRule> = {
  freq: { label: "freq", min: 0.4, max: 4.2 },
  speed: { label: "speed", min: 0.0, max: 2.5 },
  complexity: { label: "complexity", min: 1, max: 7, integer: true },
  hue: { label: "hue", min: -180, max: 180 },
};

export function CommandInput({ onCommand, onCapture }: CommandInputProps) {
  const [input, setInput] = useState("");
  const [message, setMessage] = useState<string>("Enter `freq 1.00`, `speed 1.2`, `complexity 4`, `hue 0`, or `capture`.");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const execute = () => {
    const trimmed = input.trim();
    if (!trimmed) {
      setStatus("error");
      setMessage("Command input is empty.");
      return;
    }

    if (trimmed.toLowerCase() === "capture") {
      onCapture();
      setStatus("success");
      setMessage("Capture triggered.");
      setInput("");
      return;
    }

    const [rawName, rawValue] = trimmed.split(/\s+/, 2);
    const name = rawName?.toLowerCase() as CommandName;
    const rule = COMMAND_RULES[name];

    if (!rule) {
      setStatus("error");
      setMessage("Unknown command. Use freq, speed, complexity, hue, or capture.");
      return;
    }

    const value = Number(rawValue);
    if (!Number.isFinite(value)) {
      setStatus("error");
      setMessage(`\`${rule.label}\` requires a numeric value.`);
      return;
    }

    if (rule.integer && !Number.isInteger(value)) {
      setStatus("error");
      setMessage(`\`${rule.label}\` must be an integer between ${rule.min} and ${rule.max}.`);
      return;
    }

    if (value < rule.min || value > rule.max) {
      setStatus("error");
      setMessage(`\`${rule.label}\` must be between ${rule.min} and ${rule.max}.`);
      return;
    }

    onCommand(name, value);
    setStatus("success");
    setMessage(`Applied ${rule.label} = ${value}.`);
    setInput("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-[720px] space-y-3 z-50"
    >
      <div className="flex items-center space-x-4 bg-black/40 border border-chorus-primary/30 backdrop-blur-xl px-6 py-4 rounded-2xl shadow-[0_0_50px_rgba(0,245,212,0.1)] group">
        <div className="text-chorus-primary font-mono text-lg glow-text group-focus-within:animate-pulse">L</div>
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              execute();
            }
          }}
          placeholder="Set the field drive, hue, or lattice density..."
          className="bg-transparent border-none outline-none text-white placeholder-white/20 w-full text-sm font-light tracking-wide focus:placeholder-white/40 transition-all"
        />
        <button
          onClick={execute}
          className="flex items-center space-x-2 rounded-xl border border-white/10 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-white/60 transition hover:border-chorus-primary/40 hover:text-chorus-primary"
        >
          <span>Enter</span>
        </button>
      </div>

      <div
        className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-[10px] font-mono uppercase tracking-[0.18em] ${
          status === "error"
            ? "border-chorus-danger/30 bg-chorus-danger/10 text-chorus-danger"
            : status === "success"
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
              : "border-white/10 bg-white/5 text-white/40"
        }`}
      >
        {status === "error" ? (
          <AlertCircle className="h-3.5 w-3.5" />
        ) : status === "success" ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <div className="h-3.5 w-3.5 rounded-full border border-white/20" />
        )}
        <span>{message}</span>
      </div>
    </motion.div>
  );
}
