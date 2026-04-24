import { useCallback, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  hasStaffBackendForFetch,
  readEnvBackendUrl,
  readSessionBackendUrl,
  resolveBackendUrl,
  staffApiRequestUrl,
} from "@/lib/backendUrl";
import { sanitizeHttpApiMessage, userFacingApiError } from "@/lib/errorMessages";
import { supabase } from "@/lib/supabase";
import { refreshSupabaseSessionIfStale } from "@/lib/authSession";
import type { PrescriptionOcrItem } from "@/types/prescriptionOcr";

/** Obtém sempre o access_token mais recente do cliente Supabase, evitando tokens
 *  expirados que ficam na state do componente enquanto o cliente os renova em background. */
async function getFreshToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const fresh = await refreshSupabaseSessionIfStale(data.session);
  return fresh?.access_token ?? null;
}

export function usePatientExamesHandlers(
  session: Session | null,
  patientId: string | undefined,
  refreshExames: () => Promise<void>
) {
  const allowOverride = process.env.NODE_ENV === "development";
  const envBackendUrl = readEnvBackendUrl();
  const backendUrl = useMemo(
    () => resolveBackendUrl(allowOverride, allowOverride ? readSessionBackendUrl() : null, envBackendUrl),
    [allowOverride, envBackendUrl]
  );

  const [expandedExamDocId, setExpandedExamDocId] = useState<string | null>(null);
  const [docOpenError, setDocOpenError] = useState<string | null>(null);
  const [staffUploadBusy, setStaffUploadBusy] = useState(false);
  const [staffUploadMsg, setStaffUploadMsg] = useState<string | null>(null);
  const [pendingPrescriptionItems, setPendingPrescriptionItems] = useState<PrescriptionOcrItem[]>([]);

  const staffUploadExam = useCallback(
    async (file: File) => {
      if (!session || !patientId || !hasStaffBackendForFetch(backendUrl)) {
        setStaffUploadMsg("Indique o URL do onco-backend (variável NEXT_PUBLIC_BACKEND_URL) e selecione um paciente.");
        return;
      }
      const rawMime = file.type;
      const mime = rawMime === "image/jpg" ? "image/jpeg" : rawMime;
      const allowed: string[] = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
      if (!allowed.includes(mime)) {
        setStaffUploadMsg("Use JPG, PNG, WebP, HEIC ou PDF.");
        return;
      }
      setStaffUploadBusy(true);
      setStaffUploadMsg(null);
      setPendingPrescriptionItems([]);
      try {
        const imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const s = reader.result as string;
            const i = s.indexOf("base64,");
            resolve(i >= 0 ? s.slice(i + 7) : s);
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
        const token = await getFreshToken();
        if (!token) {
          setStaffUploadMsg("Sessão expirada. Faça login novamente.");
          return;
        }
        const r = await fetch(staffApiRequestUrl(backendUrl, "/api/staff/ocr/analyze"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            patient_id: patientId,
            imageBase64,
            mimeType: mime,
          }),
        });
        const j = (await r.json()) as {
          error?: string;
          message?: string;
          extracted?: {
            ui_category?: string;
            prescription_items?: PrescriptionOcrItem[];
          };
        };
        if (!r.ok) {
          setStaffUploadMsg(sanitizeHttpApiMessage((j.message as string | undefined) ?? j.error, `Erro ${r.status}`));
          return;
        }
        if (j.extracted?.ui_category === "receitas" && (j.extracted.prescription_items?.length ?? 0) > 0) {
          setPendingPrescriptionItems(j.extracted.prescription_items ?? []);
        }
        setStaffUploadMsg("Exame processado e registrado no prontuário.");
        await refreshExames();
      } catch (e) {
        setStaffUploadMsg(userFacingApiError(e, "Falha no envio. Verifique a ligação."));
      } finally {
        setStaffUploadBusy(false);
      }
    },
    [session, patientId, backendUrl, refreshExames]
  );

  const clearPrescriptionItems = useCallback(() => {
    setPendingPrescriptionItems([]);
  }, []);

  const openStaffExamView = useCallback(
    async (documentId: string, mode: "open" | "download" = "open") => {
      if (!session || !hasStaffBackendForFetch(backendUrl)) {
        setDocOpenError("Indique o URL do onco-backend (NEXT_PUBLIC_BACKEND_URL no .env).");
        return;
      }
      setDocOpenError(null);
      const token = await getFreshToken();
      if (!token) {
        setDocOpenError("Sessão expirada. Faça login novamente.");
        return;
      }
      try {
        if (mode === "download") {
          const r = await fetch(staffApiRequestUrl(backendUrl, `/api/staff/exams/${documentId}/download`), {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!r.ok) {
            let msg = `Erro ${r.status}`;
            try {
              const j = (await r.json()) as { message?: string; error?: string };
              msg = sanitizeHttpApiMessage((j.message as string | undefined) ?? j.error, msg);
            } catch {
              /* ignore */
            }
            setDocOpenError(msg);
            return;
          }
          const blob = await r.blob();
          const cd = r.headers.get("Content-Disposition");
          let filename = `exame-${documentId.slice(0, 8)}.pdf`;
          const utf = cd?.match(/filename\*=UTF-8''([^;\s]+)/i);
          const quoted = cd?.match(/filename="([^"]+)"/i);
          if (utf?.[1]) {
            try {
              filename = decodeURIComponent(utf[1].replace(/^"|"$/g, ""));
            } catch {
              /* keep default */
            }
          } else if (quoted?.[1]) {
            filename = quoted[1];
          }
          const objectUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = objectUrl;
          a.download = filename;
          a.rel = "noopener";
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(objectUrl);
          return;
        }

        const r = await fetch(staffApiRequestUrl(backendUrl, `/api/staff/exams/${documentId}/view`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = (await r.json()) as { url?: string; error?: string; message?: string };
        if (!r.ok) {
          setDocOpenError(sanitizeHttpApiMessage((j.message as string | undefined) ?? j.error, `Erro ${r.status}`));
          return;
        }
        if (!j.url) return;
        window.open(j.url, "_blank", "noopener,noreferrer");
      } catch (e) {
        setDocOpenError(userFacingApiError(e, "Falha de rede. Verifique a ligação."));
      }
    },
    [session, backendUrl]
  );

  return {
    backendUrl,
    expandedExamDocId,
    setExpandedExamDocId,
    docOpenError,
    staffUploadBusy,
    staffUploadMsg,
    staffUploadExam,
    openStaffExamView,
    pendingPrescriptionItems,
    clearPrescriptionItems,
  };
}
