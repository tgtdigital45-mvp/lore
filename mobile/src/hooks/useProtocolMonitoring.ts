import { useCallback, useEffect, useState } from "react";
import type { PatientRow } from "@/src/hooks/usePatient";
import { fetchProtocolWithGuidelines, resolveFirstProtocolIdForCancerType } from "@/src/lib/protocolMonitoring";
import { loadProtocolMonitoringEvaluation, type DayAnchors, type FiredAlert } from "@/src/lib/protocolMonitoringEval";
import { supabase } from "@/src/lib/supabase";
import type { MonitoringGuideline, ProtocolWithGuidelines } from "@/src/types/protocolMonitoring";
import type { TreatmentCycleRow } from "@/src/types/treatment";

export type ProtocolMonitoringSource = "cycle" | "catalog_fallback" | null;

export function useProtocolMonitoring(patient: PatientRow | null, activeCycle: TreatmentCycleRow | null) {
  const [protocolWithGuidelines, setProtocolWithGuidelines] = useState<ProtocolWithGuidelines | null>(null);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<ProtocolMonitoringSource>(null);
  const [displayGuidelines, setDisplayGuidelines] = useState<MonitoringGuideline[]>([]);
  const [firedAlerts, setFiredAlerts] = useState<FiredAlert[]>([]);
  const [anchors, setAnchors] = useState<DayAnchors | null>(null);

  const reload = useCallback(async () => {
    if (!patient) {
      setProtocolWithGuidelines(null);
      setSource(null);
      setDisplayGuidelines([]);
      setFiredAlerts([]);
      setAnchors(null);
      return;
    }
    setLoading(true);
    try {
      let protocolId = activeCycle?.protocol_id ?? null;
      let src: ProtocolMonitoringSource = null;
      if (protocolId) {
        src = "cycle";
      } else if (patient.cancer_type_id) {
        const fallback = await resolveFirstProtocolIdForCancerType(supabase, patient.cancer_type_id);
        if (fallback) {
          protocolId = fallback;
          src = "catalog_fallback";
        }
      }
      if (!protocolId) {
        setProtocolWithGuidelines(null);
        setSource(null);
        setDisplayGuidelines([]);
        setFiredAlerts([]);
        setAnchors(null);
        return;
      }
      const bundle = await fetchProtocolWithGuidelines(supabase, protocolId);
      setProtocolWithGuidelines(bundle);
      setSource(bundle ? src : null);

      if (bundle && activeCycle?.id) {
        const ev = await loadProtocolMonitoringEvaluation(supabase, {
          patientId: patient.id,
          cycleId: activeCycle.id,
          protocolId: bundle.id,
          baseGuidelines: bundle.guidelines,
        });
        if (ev) {
          setDisplayGuidelines(ev.displayGuidelines);
          setFiredAlerts(ev.firedAlerts);
          setAnchors(ev.anchors);
        } else {
          setDisplayGuidelines(bundle.guidelines);
          setFiredAlerts([]);
          setAnchors(null);
        }
      } else {
        setDisplayGuidelines(bundle?.guidelines ?? []);
        setFiredAlerts([]);
        setAnchors(null);
      }
    } finally {
      setLoading(false);
    }
  }, [patient?.id, patient?.cancer_type_id, activeCycle?.id, activeCycle?.protocol_id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    protocolWithGuidelines,
    displayGuidelines,
    firedAlerts,
    anchors,
    loading,
    source,
    reload,
  };
}
