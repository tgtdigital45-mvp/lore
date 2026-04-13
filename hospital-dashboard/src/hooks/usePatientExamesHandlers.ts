import { useCallback, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { readEnvBackendUrl, readSessionBackendUrl, resolveBackendUrl } from "@/lib/backendUrl";

export function usePatientExamesHandlers(
  session: Session | null,
  patientId: string | undefined,
  refreshExames: () => Promise<void>
) {
  const allowOverride = import.meta.env.DEV;
  const envBackendUrl = readEnvBackendUrl();
  const backendUrl = useMemo(
    () => resolveBackendUrl(allowOverride, allowOverride ? readSessionBackendUrl() : null, envBackendUrl),
    [allowOverride, envBackendUrl]
  );

  const [expandedExamDocId, setExpandedExamDocId] = useState<string | null>(null);
  const [docOpenError, setDocOpenError] = useState<string | null>(null);
  const [staffUploadBusy, setStaffUploadBusy] = useState(false);
  const [staffUploadMsg, setStaffUploadMsg] = useState<string | null>(null);

  const staffUploadExam = useCallback(
    async (file: File) => {
      if (!session || !patientId || !backendUrl) {
        setStaffUploadMsg("Indique o URL do onco-backend (variável VITE_BACKEND_URL) e selecione um paciente.");
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
        const r = await fetch(`${backendUrl}/api/staff/ocr/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            patient_id: patientId,
            imageBase64,
            mimeType: mime,
          }),
        });
        const j = (await r.json()) as { error?: string; message?: string };
        if (!r.ok) {
          setStaffUploadMsg((j.message as string | undefined) ?? j.error ?? `Erro ${r.status}`);
          return;
        }
        setStaffUploadMsg("Exame processado e registrado no prontuário.");
        await refreshExames();
      } catch (e) {
        setStaffUploadMsg(e instanceof Error ? e.message : "Falha no envio");
      } finally {
        setStaffUploadBusy(false);
      }
    },
    [session, patientId, backendUrl, refreshExames]
  );

  const openStaffExamView = useCallback(
    async (documentId: string, mode: "open" | "download" = "open") => {
      if (!session || !backendUrl) {
        setDocOpenError("Indique o URL do onco-backend (VITE_BACKEND_URL no .env).");
        return;
      }
      setDocOpenError(null);
      try {
        if (mode === "download") {
          const r = await fetch(`${backendUrl}/api/staff/exams/${documentId}/download`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (!r.ok) {
            let msg = `Erro ${r.status}`;
            try {
              const j = (await r.json()) as { message?: string; error?: string };
              msg = (j.message as string | undefined) ?? j.error ?? msg;
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

        const r = await fetch(`${backendUrl}/api/staff/exams/${documentId}/view`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const j = (await r.json()) as { url?: string; error?: string; message?: string };
        if (!r.ok) {
          setDocOpenError((j.message as string | undefined) ?? j.error ?? `Erro ${r.status}`);
          return;
        }
        if (!j.url) return;
        window.open(j.url, "_blank", "noopener,noreferrer");
      } catch (e) {
        setDocOpenError(e instanceof Error ? e.message : "Falha de rede");
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
  };
}
