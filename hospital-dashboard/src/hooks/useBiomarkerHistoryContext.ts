import { useEffect, useState } from "react";
import {
  fetchBiomarkerHistoryContext,
  type MedicalDocMeta,
  type RawBiomarkerLog,
} from "@/lib/biomarkerHistoryChart";

export function useBiomarkerHistoryContext(patientId: string | undefined, invalidationKey: string) {
  const [ready, setReady] = useState(false);
  const [logs, setLogs] = useState<RawBiomarkerLog[]>([]);
  const [docMap, setDocMap] = useState<Map<string, MedicalDocMeta>>(() => new Map());

  useEffect(() => {
    if (!patientId) {
      setLogs([]);
      setDocMap(new Map());
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    void (async () => {
      const ctx = await fetchBiomarkerHistoryContext(patientId);
      if (cancelled) return;
      setLogs(ctx.logs);
      setDocMap(ctx.docMap);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId, invalidationKey]);

  return { ready, logs, docMap };
}
