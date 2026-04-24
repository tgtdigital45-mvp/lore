"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

/** Fallback para `React.lazy` (rotas e secções pesadas). */
export function PageSkeleton() {
  return (
    <motion.div
      className="flex min-h-[42vh] flex-col items-center justify-center gap-5 p-8"
      role="status"
      aria-busy="true"
      aria-live="polite"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative flex size-[4.25rem] items-center justify-center">
        <span
          className="absolute inset-0 rounded-full border-2 border-slate-200/90"
          aria-hidden
        />
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-teal-600/90 border-r-teal-500/40"
          aria-hidden
          animate={{ rotate: 360 }}
          transition={{ duration: 0.95, repeat: Infinity, ease: "linear" }}
        />
        <Loader2 className="relative size-7 text-slate-500" aria-hidden />
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-medium text-slate-600">Carregando…</p>
        <div className="flex gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-1.5 rounded-full bg-teal-600/70"
              animate={{ opacity: [0.35, 1, 0.35], scale: [0.92, 1, 0.92] }}
              transition={{
                duration: 1.1,
                repeat: Infinity,
                delay: i * 0.14,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>
      <span className="sr-only">Carregando conteúdo</span>
    </motion.div>
  );
}
