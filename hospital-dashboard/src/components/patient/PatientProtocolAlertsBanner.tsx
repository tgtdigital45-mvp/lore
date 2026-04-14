import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { loadProtocolMonitoringEvaluation, type FiredAlert } from "@/lib/protocolMonitoringEval";
import type { MonitoringGuideline } from "@/types/protocolMonitoring";
import type { TreatmentCycleRow } from "@/types/dashboard";

type Props = {
  patientId: string | undefined;
  cycles: TreatmentCycleRow[];
};

export function PatientProtocolAlertsBanner({ patientId, cycles }: Props) {
  const [fired, setFired] = useState<FiredAlert[]>([]);
  const [loading, setLoading] = useState(false);

  const active = useMemo(() => cycles.find((c) => c.status === "active"), [cycles]);

  useEffect(() => {
    if (!patientId || !active?.id || !active.protocol_id) {
      setFired([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const { data: guides, error } = await supabase
        .from("monitoring_guidelines")
        .select("*")
        .eq("protocol_id", active.protocol_id as string)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      if (error) {
        setFired([]);
        setLoading(false);
        return;
      }
      const base = (guides ?? []) as MonitoringGuideline[];
      const ev = await loadProtocolMonitoringEvaluation(supabase, {
        patientId,
        cycleId: active.id,
        protocolId: active.protocol_id as string,
        baseGuidelines: base,
      });
      if (!cancelled) {
        setFired(ev?.firedAlerts ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId, active?.id, active?.protocol_id]);

  if (!patientId || !active?.protocol_id) return null;
  if (loading) {
    return (
      <div className="mb-4 rounded-2xl border border-[#E8EAED] bg-white px-4 py-3 text-sm text-muted-foreground">
        A carregar alertas do protocolo…
      </div>
    );
  }
  if (fired.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {fired.map((fa) => (
        <div
          key={fa.rule.id}
          className="flex gap-3 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#7F1D1D]"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#B91C1C]" aria-hidden />
          <div>
            <p className="font-bold">Alerta do protocolo</p>
            <p className="mt-1 font-medium">{fa.message}</p>
            {fa.rule.action_required ? <p className="mt-1 text-xs opacity-90">{fa.rule.action_required}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
