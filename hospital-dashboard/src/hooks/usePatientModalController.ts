import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { buildRiskRow } from "../lib/triage";
import {
  waProfileFromPatientsJoin,
  profileName,
  profileAvatarUrl,
  profileDob,
  ageFromDob,
  initialsFromName,
} from "../lib/dashboardProfile";
import {
  readEnvBackendUrl,
  resolveBackendUrl,
  persistSessionBackendUrl,
  BACKEND_URL_STORAGE_KEY,
} from "../lib/backendUrl";
import { supabase } from "../lib/supabase";
import type {
  BiomarkerModalRow,
  MedicalDocModalRow,
  MedicationLogRow,
  ModalTabId,
  NutritionLogRow,
  OutboundMessageRow,
  PatientRow,
  RiskRow,
  SymptomLogDetail,
  SymptomLogTriage,
  TreatmentCycleRow,
  TreatmentInfusionRow,
  VitalLogRow,
  WaProfileSnap,
  WearableSampleRow,
  MergedAlertRules,
  CycleReadinessRow,
} from "../types/dashboard";
import type { PatientModalProps } from "../components/patient/patientModalProps";

export function usePatientModalController(
  session: Session | null,
  triageRules: MergedAlertRules,
  riskRows: RiskRow[]
) {
  const allowBackendUrlOverride = import.meta.env.DEV;
  const envBackendUrl = readEnvBackendUrl();
  const [backendUrlSession, setBackendUrlSession] = useState<string | null>(null);
  const [backendUrlInput, setBackendUrlInput] = useState("");

  useEffect(() => {
    if (!allowBackendUrlOverride) {
      setBackendUrlInput(envBackendUrl);
      setBackendUrlSession(null);
      return;
    }
    const s = (() => {
      try {
        return sessionStorage.getItem(BACKEND_URL_STORAGE_KEY)?.trim().replace(/\/$/, "") ?? null;
      } catch {
        return null;
      }
    })();
    if (s) {
      setBackendUrlSession(s);
      setBackendUrlInput(s);
    } else {
      setBackendUrlInput(envBackendUrl);
    }
  }, [allowBackendUrlOverride, envBackendUrl]);

  const backendUrl = resolveBackendUrl(allowBackendUrlOverride, backendUrlSession, envBackendUrl);

  const applyBackendUrlFromInput = useCallback(() => {
    if (!allowBackendUrlOverride) return;
    const t = backendUrlInput.trim().replace(/\/$/, "");
    if (t) {
      persistSessionBackendUrl(t);
      setBackendUrlSession(t);
    } else {
      persistSessionBackendUrl(null);
      setBackendUrlSession(null);
      setBackendUrlInput(envBackendUrl);
    }
  }, [allowBackendUrlOverride, backendUrlInput, envBackendUrl]);

  const [modalPatient, setModalPatient] = useState<RiskRow | null>(null);
  const [modalCycles, setModalCycles] = useState<TreatmentCycleRow[]>([]);
  const [modalSymptoms, setModalSymptoms] = useState<SymptomLogDetail[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalOutbound, setModalOutbound] = useState<OutboundMessageRow[]>([]);
  const [modalWaProfile, setModalWaProfile] = useState<WaProfileSnap | null>(null);
  const [waCompose, setWaCompose] = useState("");
  const [waSendBusy, setWaSendBusy] = useState(false);
  const [waSendError, setWaSendError] = useState<string | null>(null);
  const [waSendOk, setWaSendOk] = useState<string | null>(null);
  const [modalBiomarkers, setModalBiomarkers] = useState<BiomarkerModalRow[]>([]);
  const [modalMedicalDocs, setModalMedicalDocs] = useState<MedicalDocModalRow[]>([]);
  const [modalInfusions, setModalInfusions] = useState<TreatmentInfusionRow[]>([]);
  const [modalVitals, setModalVitals] = useState<VitalLogRow[]>([]);
  const [modalWearables, setModalWearables] = useState<WearableSampleRow[]>([]);
  const [modalMedicationLogs, setModalMedicationLogs] = useState<MedicationLogRow[]>([]);
  const [modalNutritionLogs, setModalNutritionLogs] = useState<NutritionLogRow[]>([]);
  const [modalCycleReadiness, setModalCycleReadiness] = useState<CycleReadinessRow | null>(null);
  const [modalExamesReady, setModalExamesReady] = useState(false);
  const [modalMsgsReady, setModalMsgsReady] = useState(false);
  const [examesTabLoading, setExamesTabLoading] = useState(false);
  const [docOpenError, setDocOpenError] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<ModalTabId>("resumo");
  const [staffUploadBusy, setStaffUploadBusy] = useState(false);
  const [staffUploadMsg, setStaffUploadMsg] = useState<string | null>(null);
  const [expandedExamDocId, setExpandedExamDocId] = useState<string | null>(null);
  const auditedPatientIds = useRef(new Set<string>());

  const openPatientModal = useCallback(async (r: RiskRow, tab: ModalTabId = "resumo") => {
    setModalTab(tab);
    setModalPatient(r);
    if (auditedPatientIds.current.has(r.id)) return;
    auditedPatientIds.current.add(r.id);
    const { error } = await supabase.rpc("record_audit", {
      p_target_patient_id: r.id,
      p_action: "VIEW_PATIENT",
      p_metadata: { source: "hospital_dashboard" },
    });
    if (error) console.warn("Auditoria:", error.message);
  }, []);

  const openPatientById = useCallback(
    async (patientId: string, tab: ModalTabId = "resumo") => {
      const existing = riskRows.find((x) => x.id === patientId);
      if (existing) {
        await openPatientModal(existing, tab);
        return;
      }
      setModalTab(tab);
      const nowMs = Date.now();
      const rules = triageRules;
      const fetchHours = Math.max(168, rules.alert_window_hours);
      const sinceFetch = new Date(nowMs - fetchHours * 3600 * 1000);
      const { data: prow, error: pe } = await supabase
        .from("patients")
        .select("id, primary_cancer_type, current_stage, is_in_nadir, patient_code, profiles!patients_profile_id_fkey ( full_name, date_of_birth, avatar_url )")
        .eq("id", patientId)
        .maybeSingle();
      if (pe || !prow) return;
      const p = prow as PatientRow;
      const { data: logs, error: le } = await supabase
        .from("symptom_logs")
        .select(
          "patient_id, severity, logged_at, symptom_category, body_temperature, entry_kind, pain_level, nausea_level, fatigue_level, ae_max_grade, triage_semaphore"
        )
        .eq("patient_id", patientId)
        .gte("logged_at", sinceFetch.toISOString());
      if (le) return;
      const logRows = (logs ?? []) as SymptomLogTriage[];
      const rr = buildRiskRow(p, logRows, rules, nowMs);
      await openPatientModal(rr, tab);
    },
    [riskRows, triageRules, openPatientModal]
  );

  const staffUploadExam = useCallback(
    async (file: File) => {
      if (!session || !modalPatient || !backendUrl) {
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
            patient_id: modalPatient.id,
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
        const pid = modalPatient.id;
        const [bio, mdocs] = await Promise.all([
          supabase
            .from("biomarker_logs")
            .select("id, medical_document_id, name, value_numeric, value_text, unit, is_abnormal, reference_range, reference_alert, logged_at")
            .eq("patient_id", pid)
            .order("logged_at", { ascending: false })
            .limit(60),
          supabase
            .from("medical_documents")
            .select("id, document_type, uploaded_at, exam_performed_at, storage_path, mime_type, ai_extracted_json")
            .eq("patient_id", pid)
            .order("uploaded_at", { ascending: false })
            .limit(40),
        ]);
        setModalBiomarkers(
          !bio.error && bio.data
            ? (bio.data as Record<string, unknown>[]).map((row) => ({
                ...row,
                medical_document_id: (row.medical_document_id as string | null | undefined) ?? null,
              })) as BiomarkerModalRow[]
            : []
        );
        setModalMedicalDocs(!mdocs.error && mdocs.data ? (mdocs.data as MedicalDocModalRow[]) : []);
      } catch (e) {
        setStaffUploadMsg(e instanceof Error ? e.message : "Falha no envio");
      } finally {
        setStaffUploadBusy(false);
      }
    },
    [session, modalPatient, backendUrl]
  );

  const sendWhatsApp = useCallback(async () => {
    if (!session || !modalPatient || !backendUrl) return;
    const text = waCompose.trim();
    if (!text) {
      setWaSendError("Digite uma mensagem.");
      return;
    }
    setWaSendBusy(true);
    setWaSendError(null);
    setWaSendOk(null);
    try {
      const r = await fetch(`${backendUrl}/api/whatsapp/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ patient_id: modalPatient.id, message: text }),
      });
      const j = (await r.json()) as { error?: string; message?: string };
      if (!r.ok) {
        setWaSendError((j.message as string | undefined) ?? j.error ?? `Erro ${r.status}`);
        return;
      }
      setWaCompose("");
      setWaSendOk("Mensagem enviada.");
      const { data } = await supabase
        .from("outbound_messages")
        .select("id, body, status, created_at, error_detail")
        .eq("patient_id", modalPatient.id)
        .order("created_at", { ascending: false })
        .limit(25);
      setModalOutbound((data ?? []) as OutboundMessageRow[]);
    } catch (e) {
      setWaSendError(e instanceof Error ? e.message : "Falha de rede");
    } finally {
      setWaSendBusy(false);
    }
  }, [session, modalPatient, waCompose, backendUrl]);

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

  useEffect(() => {
    if (!modalPatient) {
      setModalCycles([]);
      setModalSymptoms([]);
      setModalOutbound([]);
      setModalWaProfile(null);
      setModalBiomarkers([]);
      setModalMedicalDocs([]);
      setModalInfusions([]);
      setModalVitals([]);
      setModalWearables([]);
      setModalMedicationLogs([]);
      setModalNutritionLogs([]);
      setModalCycleReadiness(null);
      setModalExamesReady(false);
      setModalMsgsReady(false);
      setExamesTabLoading(false);
      setWaCompose("");
      setWaSendError(null);
      setWaSendOk(null);
      setDocOpenError(null);
      setModalError(null);
      setModalLoading(false);
      setModalTab("resumo");
      setStaffUploadMsg(null);
      setExpandedExamDocId(null);
      return;
    }
    let cancelled = false;
    setModalLoading(true);
    setModalError(null);
    setWaSendError(null);
    setWaSendOk(null);
    setDocOpenError(null);
    setModalExamesReady(false);
    setModalMsgsReady(false);
    const pid = modalPatient.id;
    const sinceWear = new Date(Date.now() - 14 * 86400000).toISOString();
    void (async () => {
      const [cyc, sym, inf, vit, wear, meds, nut, cr] = await Promise.all([
        supabase
          .from("treatment_cycles")
          .select(
            "id, protocol_name, start_date, end_date, status, treatment_kind, notes, planned_sessions, completed_sessions, last_session_at, last_weight_kg, infusion_interval_days"
          )
          .eq("patient_id", pid)
          .order("start_date", { ascending: false })
          .limit(36),
        supabase
          .from("symptom_logs")
          .select(
            "id, symptom_category, severity, body_temperature, logged_at, notes, entry_kind, pain_level, nausea_level, fatigue_level, requires_action, mood, symptom_started_at, symptom_ended_at, ae_max_grade, flow_context, triage_semaphore"
          )
          .eq("patient_id", pid)
          .order("logged_at", { ascending: false })
          .limit(150),
        supabase
          .from("treatment_infusions")
          .select("id, cycle_id, patient_id, session_at, status")
          .eq("patient_id", pid)
          .order("session_at", { ascending: false })
          .limit(80),
        supabase
          .from("vital_logs")
          .select("id, logged_at, vital_type, value_numeric, value_systolic, value_diastolic, unit, notes")
          .eq("patient_id", pid)
          .order("logged_at", { ascending: false })
          .limit(150),
        supabase
          .from("health_wearable_samples")
          .select("id, metric, value_numeric, unit, observed_start, metadata")
          .eq("patient_id", pid)
          .gte("observed_start", sinceWear)
          .order("observed_start", { ascending: false })
          .limit(400),
        supabase
          .from("medication_logs")
          .select(
            "id, medication_id, patient_id, taken_at, scheduled_time, taken_time, quantity, status, notes, created_at, medications ( name, dosage )"
          )
          .eq("patient_id", pid)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("nutrition_logs")
          .select("id, logged_at, log_type, quantity, meal_name, calories, protein_g, carbs_g, fat_g, appetite_level, notes")
          .eq("patient_id", pid)
          .order("logged_at", { ascending: false })
          .limit(40),
        supabase.from("cycle_readiness").select("*").eq("patient_id", pid).limit(1).maybeSingle(),
      ]);
      if (cancelled) return;
      if (cyc.error || sym.error) {
        setModalError(cyc.error?.message ?? sym.error?.message ?? "Erro ao carregar dados");
        setModalCycles([]);
        setModalSymptoms([]);
      } else {
        setModalCycles((cyc.data ?? []) as TreatmentCycleRow[]);
        setModalSymptoms((sym.data ?? []) as SymptomLogDetail[]);
      }
      setModalInfusions(!inf.error && inf.data ? (inf.data as TreatmentInfusionRow[]) : []);
      setModalVitals(!vit.error && vit.data ? (vit.data as VitalLogRow[]) : []);
      setModalWearables(
        !wear.error && wear.data
          ? (wear.data as Record<string, unknown>[]).map((row) => ({
              ...row,
              metadata:
                typeof row.metadata === "object" && row.metadata !== null && !Array.isArray(row.metadata)
                  ? (row.metadata as Record<string, unknown>)
                  : {},
            })) as WearableSampleRow[]
          : []
      );
      setModalMedicationLogs(!meds.error && meds.data ? (meds.data as MedicationLogRow[]) : []);
      setModalNutritionLogs(!nut.error && nut.data ? (nut.data as NutritionLogRow[]) : []);
      setModalCycleReadiness(!cr.error && cr.data ? (cr.data as CycleReadinessRow) : null);
      setModalLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [modalPatient?.id]);

  useEffect(() => {
    if (!modalPatient || modalTab !== "exames" || modalExamesReady) return;
    let cancelled = false;
    setExamesTabLoading(true);
    const pid = modalPatient.id;
    void (async () => {
      const [bio, mdocs] = await Promise.all([
        supabase
          .from("biomarker_logs")
          .select("id, medical_document_id, name, value_numeric, value_text, unit, is_abnormal, reference_range, reference_alert, logged_at")
          .eq("patient_id", pid)
          .order("logged_at", { ascending: false })
          .limit(60),
        supabase
          .from("medical_documents")
          .select("id, document_type, uploaded_at, exam_performed_at, storage_path, mime_type, ai_extracted_json")
          .eq("patient_id", pid)
          .order("uploaded_at", { ascending: false })
          .limit(40),
      ]);
      if (cancelled) return;
      setModalBiomarkers(
        !bio.error && bio.data
          ? (bio.data as Record<string, unknown>[]).map((row) => ({
              ...row,
              medical_document_id: (row.medical_document_id as string | null | undefined) ?? null,
            })) as BiomarkerModalRow[]
          : []
      );
      setModalMedicalDocs(!mdocs.error && mdocs.data ? (mdocs.data as MedicalDocModalRow[]) : []);
      setModalExamesReady(true);
      setExamesTabLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [modalPatient?.id, modalTab, modalExamesReady]);

  useEffect(() => {
    if (!modalPatient || modalTab !== "mensagens" || modalMsgsReady) return;
    let cancelled = false;
    const pid = modalPatient.id;
    void (async () => {
      const [out, pat] = await Promise.all([
        supabase
          .from("outbound_messages")
          .select("id, body, status, created_at, error_detail")
          .eq("patient_id", pid)
          .order("created_at", { ascending: false })
          .limit(25),
        supabase
          .from("patients")
          .select("profiles!patients_profile_id_fkey ( phone_e164, whatsapp_opt_in_at, whatsapp_opt_in_revoked_at )")
          .eq("id", pid)
          .single(),
      ]);
      if (cancelled) return;
      if (!out.error && out.data) {
        setModalOutbound(out.data as OutboundMessageRow[]);
      } else {
        setModalOutbound([]);
      }
      if (!pat.error && pat.data) {
        setModalWaProfile(waProfileFromPatientsJoin((pat.data as { profiles: unknown }).profiles));
      } else {
        setModalWaProfile(null);
      }
      setModalMsgsReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [modalPatient?.id, modalTab, modalMsgsReady]);

  const closeModal = useCallback(() => setModalPatient(null), []);

  const patientModalProps: PatientModalProps | null = modalPatient
    ? {
        modalPatient,
        onClose: closeModal,
        modalTab,
        onTabChange: setModalTab,
        triageRules,
        modalLoading,
        modalError,
        modalCycles,
        modalInfusions,
        modalSymptoms,
        modalVitals,
        modalWearables,
        modalMedicationLogs,
        modalNutritionLogs,
        modalCycleReadiness,
        modalBiomarkers,
        modalMedicalDocs,
        modalOutbound,
        modalWaProfile,
        waCompose,
        onWaCompose: setWaCompose,
        onSendWhatsApp: sendWhatsApp,
        waSendBusy,
        waSendError,
        waSendOk,
        backendUrl,
        docOpenError,
        staffUploadBusy,
        staffUploadMsg,
        onStaffUpload: staffUploadExam,
        onOpenExam: openStaffExamView,
        expandedExamDocId,
        onExpandedExamDocId: setExpandedExamDocId,
        examesTabLoading,
        displayName: profileName(modalPatient.profiles),
        displayInitials: initialsFromName(profileName(modalPatient.profiles)),
        displayAvatarUrl: profileAvatarUrl(modalPatient.profiles),
        ageLabel: ageFromDob(profileDob(modalPatient.profiles)) ?? "Idade não informada",
      }
    : null;

  return {
    modalPatient,
    openPatientModal,
    openPatientById,
    closeModal,
    patientModalProps,
    backendUrl,
    allowBackendUrlOverride,
    backendUrlInput,
    setBackendUrlInput,
    applyBackendUrlFromInput,
  };
}
