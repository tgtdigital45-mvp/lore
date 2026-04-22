import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { clinicalTier } from "@/lib/clinicalTier";
import type { RiskRow } from "@/types/dashboard";
import { Button } from "@/components/ui/button";

function profileName(row: RiskRow): string {
  const p = row.profiles;
  const p0 = Array.isArray(p) ? p[0] : p;
  return (p0?.full_name ?? "Paciente").trim() || "Paciente";
}

type Props = {
  rows: RiskRow[];
};

/** Faixa de emergência: nadir + tier crítico (neutropenia febril / risco iminente). */
export function NadirAlertBanner({ rows }: Props) {
  const emergency = rows.filter((r) => r.is_in_nadir && clinicalTier(r) === "critical");

  return (
    <AnimatePresence mode="wait">
      {emergency.length > 0 ? (
        <motion.div
          key="nadir-banner"
          role="alert"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.28 }}
          className="overflow-hidden rounded-2xl border-2 border-amber-500/80 bg-gradient-to-r from-rose-600/95 via-rose-700/95 to-amber-700/90 px-4 py-3 text-white shadow-lg"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <AlertTriangle className="size-5 text-amber-200" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black tracking-tight">Ação requerida — risco em nadir</p>
                <p className="mt-0.5 text-xs font-medium text-rose-100/95">
                  {emergency.length === 1
                    ? `${profileName(emergency[0])} — possível neutropenia febril ou alerta crítico durante o nadir.`
                    : `${emergency.length} pacientes com nadir + triagem crítica — rever imediatamente.`}
                </p>
                {emergency.length <= 4 ? (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {emergency.map((r) => (
                      <li key={r.id}>
                        <Link
                          to={`/paciente/${r.id}`}
                          className="inline-flex rounded-full bg-white/20 px-2.5 py-0.5 text-[0.7rem] font-semibold underline-offset-2 hover:underline"
                        >
                          {profileName(r)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              className="shrink-0 rounded-full border border-white/30 bg-white/15 font-bold text-white hover:bg-white/25"
              asChild
            >
              <Link to="/paciente">Abrir fila</Link>
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
