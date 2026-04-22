import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { CheckCircle, Info } from "lucide-react";

interface Log {
  id: string;
  message: string;
  type: "info" | "success";
  timestamp: string;
}

export function Notifications() {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    const messages = [
      "CHORUS_CORE: KERNEL_WARM",
      "LUMINA_BRIDGE: LINK_READY",
      "NONAGRAM_PLATE: SYNC_VALID",
      "DAN_OMEGA: EMITTING_PROOFS",
      "MODEL_CHECKER: 0_VIOLATIONS",
      "MFCS_SEAL: LOCKED",
      "REPAIR_ARC: CLOSED",
      "INVARIANT_03: STABLE",
      "RECURSION_DEPTH: [0]",
    ];

    const interval = setInterval(() => {
      const message = messages[Math.floor(Math.random() * messages.length)];
      const nextLog: Log = {
        id: Math.random().toString(36).slice(2),
        message,
        type: Math.random() > 0.15 ? "info" : "success",
        timestamp: new Date().toLocaleTimeString(),
      };

      setLogs((current) => [nextLog, ...current].slice(0, 5));
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed top-8 right-8 z-50 flex flex-col gap-2 w-72 pointer-events-none">
      <AnimatePresence>
        {logs.map((log) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className="glass-panel p-2 flex items-center gap-2 border-l-2 border-l-chorus-primary"
          >
            {log.type === "info" ? (
              <Info className="w-3 h-3 text-chorus-primary" />
            ) : (
              <CheckCircle className="w-3 h-3 text-chorus-primary" />
            )}
            <div className="flex-1">
              <div className="text-[8px] font-mono text-chorus-primary/50 tracking-tighter">{log.timestamp}</div>
              <div className="text-[10px] font-mono text-white tracking-widest">{log.message}</div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
