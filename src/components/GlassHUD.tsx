import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils";

interface GlassHUDProps {
  children: ReactNode;
  title?: string;
  className?: string;
  delay?: number;
}

export function GlassHUD({ children, title, className, delay = 0 }: GlassHUDProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      whileFocus={{ scale: 1.05 }}
      transition={{ delay, duration: 0.3 }}
      tabIndex={0}
      className={cn(
        "bg-white/5 border border-white/10 backdrop-blur-md rounded-lg p-4 flex flex-col shadow-2xl relative outline-none transition-all duration-300",
        "group focus:border-chorus-primary focus:shadow-[0_0_30px_rgba(0,245,214,0.3)] hover:border-chorus-primary/50 hover:shadow-[0_0_20px_rgba(0,245,214,0.15)]",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-chorus-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-lg" />
      {title ? (
        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-chorus-primary glow-text">{title}</h3>
          <div className="flex gap-1.5">
            <div className="w-1.5 h-1.5 bg-chorus-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(0,245,214,0.6)]" />
          </div>
        </div>
      ) : null}
      <div className="flex-1 overflow-auto custom-scrollbar scrollbar-hide">{children}</div>
    </motion.div>
  );
}
