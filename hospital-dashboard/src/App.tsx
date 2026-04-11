import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AUDIT_ACTION_PT,
  CANCER_EMOJI,
  CANCER_PT,
  CARE_TIPS,
  CYCLE_STATUS_PT,
  DOCUMENT_TYPE_PT,
  MODAL_TAB_LABEL,
  OUTBOUND_STATUS_PT,
  SEVERITY_PT,
  SEVERITY_RANK,
} from "./constants/dashboardLabels";
import { MainNavigation } from "./components/MainNavigation";
import {
  IconActivity,
  IconHamburger,
  IconLogout,
  IconSend,
  IconUserCircle,
} from "./components/DashboardIcons";
import {
  buildRiskRow,
  DEFAULT_ALERT_RULES,
  mergeAlertRulesFromAssignments,
  patientClinicalAlert,
} from "./lib/triage";
import { DASHBOARD_TABS, pathnameToTab, tabToPath } from "./nav";
import { supabase } from "./lib/supabase";
import { formatAuthError } from "./authErrors";
import { ensureStaffIfPending, setPendingStaffRole } from "./staffLink";
import type {
  AuditLogRow,
  BiomarkerModalRow,
  HospitalMetaRow,
  MedicalDocModalRow,
  MessageFeedRow,
  ModalTabId,
  OutboundMessageRow,
  PatientRow,
  RiskRow,
  SymptomLogDetail,
  SymptomLogTriage,
  TreatmentCycleRow,
  WaProfileSnap,
  MergedAlertRules,
} from "./types/dashboard";
import "./App.css";

/** URL pública do onco-backend; lida em build-time. */
const BACKEND_URL_STORAGE_KEY = "aura_hospital_backend_url";

function readEnvBackendUrl(): string {
  return (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, "").trim() ?? "";
}

function formatBiomarkerValue(r: BiomarkerModalRow): string {
  if (r.value_numeric != null && Number.isFinite(r.value_numeric)) return String(r.value_numeric);
  if (r.value_text != null && String(r.value_text).trim() !== "") return String(r.value_text);
  return "—";
}

function waProfileFromPatientsJoin(profiles: unknown): WaProfileSnap {
  const row = Array.isArray(profiles) ? profiles[0] : profiles;
  if (!row || typeof row !== "object") return { phone_e164: null, optIn: false };
  const o = row as Record<string, unknown>;
  const phone = typeof o.phone_e164 === "string" ? o.phone_e164 : null;
  const hasIn = o.whatsapp_opt_in_at != null;
  const hasRev = o.whatsapp_opt_in_revoked_at != null;
  return { phone_e164: phone, optIn: hasIn && !hasRev };
}

function profileName(p: PatientRow["profiles"]): string {
  if (!p) return "—";
  if (Array.isArray(p)) return p[0]?.full_name ?? "—";
  return p.full_name ?? "—";
}

function firstName(full: string): string {
  const t = full.trim();
  if (!t) return "Profissional";
  return t.split(/\s+/)[0] ?? t;
}

function roleLabel(role: string | undefined): string {
  if (role === "doctor") return "Médico(a)";
  if (role === "nurse") return "Enfermeiro(a)";
  if (role === "hospital_admin") return "Gestão hospitalar";
  return "Equipe clínica";
}

function formatPtShort(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return "—";
  }
}

function formatPtDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatPtDateLong(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return "—";
  }
}

function formatPtTimeShort(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function chatDayKey(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  } catch {
    return iso;
  }
}

function formatChatDayLabel(iso: string): string {
  try {
    const d = new Date(iso);
    const today = new Date();
    const dayMs = 86400000;
    const strip = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = strip(d) - strip(today);
    if (diff === 0) return "Hoje";
    if (diff === -dayMs) return "Ontem";
    return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  } catch {
    return "—";
  }
}

function profileDob(p: PatientRow["profiles"]): string | null {
  if (!p) return null;
  const row = Array.isArray(p) ? p[0] : p;
  return row?.date_of_birth ?? null;
}

function ageFromDob(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    const t = new Date();
    let age = t.getFullYear() - d.getFullYear();
    const m = t.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--;
    return `${age} anos`;
  } catch {
    return null;
  }
}

function initialsFromName(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

type RiskRow = PatientRow & {
  risk: number;
  riskLabel: string;
  riskClass: string;
  lastSymptomAt: string | null;
  hasClinicalAlert: boolean;
  alertReasons: string[];
  hasAlert24h: boolean;
};

type HospitalMetaRow = {
  id: string;
  name: string;
  alert_rules: Record<string, unknown>;
  integration_settings: Record<string, unknown>;
};

type MessageFeedRow = {
  id: string;
  body: string | null;
  status: string;
  created_at: string;
  patient_id: string;
  patients: { profiles: { full_name?: string } | { full_name?: string }[] | null } | null;
};

type ModalTabId = "resumo" | "exames" | "mensagens" | "diario";

type AuditLogRow = {
  id: string;
  ts: string;
  action_type: string;
  metadata: Record<string, unknown>;
  actor_name: string;
  patient_name: string;
};

const AUDIT_ACTION_PT: Record<string, string> = {
  VIEW_SYMPTOMS: "Ver sintomas",
  VIEW_PROFILE: "Ver perfil",
  VIEW_PATIENT: "Abrir prontuário",
  EMERGENCY_TRIGGER: "Emergência",
  AGENT_SYMPTOM_LOG: "Registro (agente)",
};

const OUTBOUND_STATUS_PT: Record<string, string> = {
  pending: "Pendente",
  sent: "Enviada",
  delivered: "Entregue",
  read: "Lida",
  failed: "Falhou",
};

const MODAL_TAB_LABEL: Record<ModalTabId, string> = {
  resumo: "Resumo",
  exames: "Exames",
  mensagens: "Mensagens",
  diario: "Diário",
};

function riskFromRank(n: number, inNadir: boolean): { label: string; cls: string } {
  if (n >= 4) return { label: "Crítico", cls: "risk-critical" };
  if (n >= 3) return { label: "Alto", cls: "risk-high" };
  if (n >= 2) return { label: "Médio", cls: "risk-mid" };
  if (n >= 1) return { label: "Baixo", cls: "risk-low" };
  if (inNadir) return { label: "Nadir (vigilância)", cls: "risk-nadir" };
  return { label: "Sem registros recentes", cls: "risk-none" };
}

function dotClassForRisk(cls: string): string {
  if (cls === "risk-critical") return "activity-dot activity-dot--critical";
  if (cls === "risk-high") return "activity-dot activity-dot--high";
  if (cls === "risk-mid") return "activity-dot activity-dot--mid";
  if (cls === "risk-low") return "activity-dot activity-dot--low";
  if (cls === "risk-nadir") return "activity-dot activity-dot--nadir";
  return "activity-dot activity-dot--none";
}

function triageEstadoChat(r: RiskRow): { label: string; cls: string } {
  if (r.risk >= 4 || r.hasClinicalAlert) return { label: "Crítico", cls: "risk-critical" };
  if (r.risk >= 1 || r.is_in_nadir) return { label: "Estável", cls: "risk-mid" };
  return { label: "Normal", cls: "risk-low" };
}

function pillClassForSeverity(sev: string): string {
  if (sev === "life_threatening") return "risk-critical";
  if (sev === "severe") return "risk-high";
  if (sev === "moderate") return "risk-mid";
  if (sev === "mild") return "risk-low";
  return "risk-none";
}

const CARE_TIPS = [
  {
    emoji: "💧",
    title: "Hidratação no tratamento",
    text: "Água suficiente ajuda no metabolismo de fármacos e reduz fadiga.",
  },
  {
    emoji: "🌡️",
    title: "Febre ou infecção",
    text: "Com nadir ou quimio, avise a equipe ante febre ≥ 38 °C.",
  },
  {
    emoji: "📝",
    title: "Diário de sintomas",
    text: "Pacientes no app Aura registram sintomas; a triagem prioriza gravidade recente.",
  },
] as const;

function IconDashboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconHamburger() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconActivity() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconMessages() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconIntegration() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function IconGestao() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function IconUserCircle() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const navActive = pathnameToTab(location.pathname);
  const [session, setSession] = useState<Session | null>(null);
  const [authView, setAuthView] = useState<"login" | "cadastro">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rows, setRows] = useState<RiskRow[]>([]);
  const [filterCancer, setFilterCancer] = useState<string>("");
  const [filterAlertOnly, setFilterAlertOnly] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [triageRules, setTriageRules] = useState<MergedAlertRules>(DEFAULT_ALERT_RULES);
  const [busy, setBusy] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [staffProfile, setStaffProfile] = useState<{ full_name: string; role: string } | null>(null);
  const [hospitalNames, setHospitalNames] = useState<string[]>([]);
  const [hospitalsMeta, setHospitalsMeta] = useState<HospitalMetaRow[]>([]);
  /** false = rail estreito só com ícones; true = expande à direita com nomes das secções */
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [settingsHospitalId, setSettingsHospitalId] = useState<string | null>(null);
  const [settingsDraft, setSettingsDraft] = useState({
    fever: DEFAULT_ALERT_RULES.fever_celsius_min,
    windowH: DEFAULT_ALERT_RULES.alert_window_hours,
    notifyEmail: false,
    notifyBanner: true,
    waPublicBackendUrl: "",
    waNotes: "",
  });
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);
  const [auditRows, setAuditRows] = useState<AuditLogRow[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditSearch, setAuditSearch] = useState("");
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
  const [docOpenError, setDocOpenError] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<ModalTabId>("resumo");
  const [messagesFeed, setMessagesFeed] = useState<MessageFeedRow[]>([]);
  const [messagesSearch, setMessagesSearch] = useState("");
  const [chatSelectedPatientId, setChatSelectedPatientId] = useState<string | null>(null);
  const [chatContactsSearch, setChatContactsSearch] = useState("");
  const [chatListFilter, setChatListFilter] = useState<"all" | "alert" | "critical">("all");
  const [staffUploadBusy, setStaffUploadBusy] = useState(false);
  const [staffUploadMsg, setStaffUploadMsg] = useState<string | null>(null);
  const [expandedExamDocId, setExpandedExamDocId] = useState<string | null>(null);
  const modalCloseRef = useRef<HTMLButtonElement>(null);
  const auditedPatientIds = useRef(new Set<string>());
  const triageReloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    if (location.pathname === "/" || location.pathname === "") {
      navigate("/painel", { replace: true });
      return;
    }
    const seg = location.pathname.replace(/^\//, "").split("/")[0];
    if (seg && !(DASHBOARD_TABS as readonly string[]).includes(seg)) {
      navigate("/painel", { replace: true });
    }
  }, [session, location.pathname, navigate]);

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) {
      setStaffProfile(null);
      return;
    }
    void (async () => {
      await ensureStaffIfPending(session);
      const { data, error } = await supabase.from("profiles").select("full_name, role").eq("id", uid).single();
      if (!error && data) setStaffProfile({ full_name: data.full_name ?? "", role: data.role ?? "" });
    })();
  }, [session]);

  const allowBackendUrlOverride = import.meta.env.DEV;
  const envBackendUrl = useMemo(() => readEnvBackendUrl(), []);
  const [backendUrlSession, setBackendUrlSession] = useState<string | null>(null);
  const [backendUrlInput, setBackendUrlInput] = useState("");
  useEffect(() => {
    if (!allowBackendUrlOverride) {
      setBackendUrlInput(envBackendUrl);
      setBackendUrlSession(null);
      return;
    }
    try {
      const s = sessionStorage.getItem(BACKEND_URL_STORAGE_KEY)?.trim().replace(/\/$/, "");
      if (s) {
        setBackendUrlSession(s);
        setBackendUrlInput(s);
        return;
      }
    } catch {
      /* ignore */
    }
    setBackendUrlInput(envBackendUrl);
  }, [allowBackendUrlOverride, envBackendUrl]);

  const backendUrl = (allowBackendUrlOverride ? (backendUrlSession ?? envBackendUrl) : envBackendUrl)
    .replace(/\/$/, "")
    .trim();
  const applyBackendUrlFromInput = useCallback(() => {
    if (!allowBackendUrlOverride) return;
    const t = backendUrlInput.trim().replace(/\/$/, "");
    if (t) {
      try {
        sessionStorage.setItem(BACKEND_URL_STORAGE_KEY, t);
      } catch {
        /* ignore */
      }
      setBackendUrlSession(t);
    } else {
      try {
        sessionStorage.removeItem(BACKEND_URL_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      setBackendUrlSession(null);
      setBackendUrlInput(envBackendUrl);
    }
  }, [allowBackendUrlOverride, backendUrlInput, envBackendUrl]);

  const loadTriage = useCallback(async () => {
    setLoadError(null);
    setBusy(true);
    const { data: assigns, error: aErr } = await supabase
      .from("staff_assignments")
      .select("hospital_id, hospitals ( name, alert_rules )");
    if (aErr) {
      setLoadError(aErr.message);
      setHospitalNames([]);
      setHospitalsMeta([]);
      setBusy(false);
      return;
    }
    if (!assigns?.length) {
      setLoadError("Nenhuma lotação hospitalar para este usuário. Peça inclusão em staff_assignments.");
      setHospitalNames([]);
      setHospitalsMeta([]);
      setBusy(false);
      return;
    }

    const rules = mergeAlertRulesFromAssignments(assigns as { hospitals?: HospitalEmbed | HospitalEmbed[] | null }[]);
    setTriageRules(rules);

    const metaMap = new Map<string, Omit<HospitalMetaRow, "integration_settings"> & { integration_settings?: Record<string, unknown> }>();
    const names = new Set<string>();
    for (const row of assigns as {
      hospital_id: string;
      hospitals?: { name?: string; alert_rules?: unknown } | { name?: string; alert_rules?: unknown }[] | null;
    }[]) {
      const h = row.hospitals;
      const list = !h ? [] : Array.isArray(h) ? h : [h];
      for (const x of list) {
        if (!x) continue;
        if (x.name) names.add(x.name);
        const ar = x.alert_rules;
        const rulesObj =
          typeof ar === "object" && ar !== null && !Array.isArray(ar) ? { ...(ar as Record<string, unknown>) } : {};
        metaMap.set(row.hospital_id, {
          id: row.hospital_id,
          name: String(x.name ?? "Hospital"),
          alert_rules: rulesObj,
        });
      }
    }
    setHospitalNames([...names]);

    const hospitalIds = [...new Set(assigns.map((a) => a.hospital_id))];
    const intByHospital = new Map<string, Record<string, unknown>>();
    const { data: intRows, error: intErr } = await supabase.from("hospitals").select("id, integration_settings").in("id", hospitalIds);
    if (!intErr && intRows) {
      for (const row of intRows as { id: string; integration_settings: unknown }[]) {
        const ir = row.integration_settings;
        intByHospital.set(
          row.id,
          typeof ir === "object" && ir !== null && !Array.isArray(ir) ? { ...(ir as Record<string, unknown>) } : {}
        );
      }
    }

    const mergedMeta: HospitalMetaRow[] = [...metaMap.values()].map((m) => ({
      ...m,
      integration_settings: intByHospital.get(m.id) ?? {},
    }));
    setHospitalsMeta(mergedMeta);

    const { data: patients, error: pErr } = await supabase
      .from("patients")
      .select("id, primary_cancer_type, current_stage, is_in_nadir, profiles ( full_name, date_of_birth )")
      .in("hospital_id", hospitalIds);
    if (pErr) {
      setLoadError(pErr.message);
      setBusy(false);
      return;
    }
    const plist = (patients ?? []) as unknown as PatientRow[];
    if (plist.length === 0) {
      setRows([]);
      setBusy(false);
      return;
    }

    const nowMs = Date.now();
    const fetchHours = Math.max(168, rules.alert_window_hours);
    const sinceFetch = new Date(nowMs - fetchHours * 3600 * 1000);
    const sinceRiskMs = nowMs - 168 * 3600 * 1000;

    const ids = plist.map((p) => p.id);
    const { data: logs, error: lErr } = await supabase
      .from("symptom_logs")
      .select("patient_id, severity, logged_at, symptom_category, body_temperature")
      .in("patient_id", ids)
      .gte("logged_at", sinceFetch.toISOString());

    if (lErr) {
      setLoadError(lErr.message);
      setBusy(false);
      return;
    }

    const logRows = (logs ?? []) as SymptomLogTriage[];

    const rules24h: MergedAlertRules = {
      fever_celsius_min: rules.fever_celsius_min,
      alert_window_hours: 24,
    };

    const maxByPatient = new Map<string, number>();
    const lastAtByPatient = new Map<string, string>();
    for (const l of logRows) {
      if (new Date(l.logged_at).getTime() < sinceRiskMs) continue;
      const r = SEVERITY_RANK[l.severity as string] ?? 0;
      const prev = maxByPatient.get(l.patient_id) ?? 0;
      if (r > prev) maxByPatient.set(l.patient_id, r);
      const cur = lastAtByPatient.get(l.patient_id);
      const la = l.logged_at as string;
      if (!cur || new Date(la) > new Date(cur)) lastAtByPatient.set(l.patient_id, la);
    }

    const enriched: RiskRow[] = plist.map((p) => {
      const n = maxByPatient.get(p.id) ?? 0;
      const { label, cls } = riskFromRank(n, p.is_in_nadir);
      const { hasAlert, reasons } = patientClinicalAlert(logRows, p.id, rules, nowMs);
      const { hasAlert: hasAlert24h } = patientClinicalAlert(logRows, p.id, rules24h, nowMs);
      return {
        ...p,
        risk: n,
        riskLabel: label,
        riskClass: cls,
        lastSymptomAt: lastAtByPatient.get(p.id) ?? null,
        hasClinicalAlert: hasAlert,
        alertReasons: reasons,
        hasAlert24h,
      };
    });

    enriched.sort(
      (a, b) =>
        (a.hasClinicalAlert === b.hasClinicalAlert ? 0 : a.hasClinicalAlert ? -1 : 1) ||
        b.risk - a.risk ||
        (a.is_in_nadir === b.is_in_nadir ? 0 : a.is_in_nadir ? -1 : 1)
    );

    setRows(enriched);

    if (ids.length) {
      const { data: omRows, error: omErr } = await supabase
        .from("outbound_messages")
        .select("id, body, status, created_at, patient_id, patients ( profiles ( full_name ) )")
        .in("patient_id", ids)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!omErr && omRows) setMessagesFeed(omRows as unknown as MessageFeedRow[]);
      else setMessagesFeed([]);
    } else {
      setMessagesFeed([]);
    }

    setBusy(false);
  }, []);

  useEffect(() => {
    if (session) void loadTriage();
  }, [session, loadTriage]);

  const scheduleTriageReload = useCallback(() => {
    if (triageReloadTimer.current) clearTimeout(triageReloadTimer.current);
    triageReloadTimer.current = setTimeout(() => {
      triageReloadTimer.current = null;
      void loadTriage();
    }, 800);
  }, [loadTriage]);

  useEffect(() => {
    return () => {
      if (triageReloadTimer.current) clearTimeout(triageReloadTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    const channel = supabase
      .channel("symptom_logs_triage")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "symptom_logs" },
        () => scheduleTriageReload()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "symptom_logs" },
        () => scheduleTriageReload()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session?.user, scheduleTriageReload]);

  useEffect(() => {
    if (!session) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadTriage();
    }, 45_000);
    return () => window.clearInterval(id);
  }, [session, loadTriage]);

  const hydrateSettingsFromHospital = useCallback((h: HospitalMetaRow) => {
    const r = h.alert_rules;
    const integ = h.integration_settings;
    const waRaw =
      typeof integ === "object" && integ !== null && !Array.isArray(integ)
        ? (integ as Record<string, unknown>).whatsapp
        : null;
    const wa = typeof waRaw === "object" && waRaw !== null && !Array.isArray(waRaw) ? (waRaw as Record<string, unknown>) : {};
    setSettingsDraft({
      fever:
        typeof r.fever_celsius_min === "number" && Number.isFinite(r.fever_celsius_min)
          ? r.fever_celsius_min
          : DEFAULT_ALERT_RULES.fever_celsius_min,
      windowH:
        typeof r.alert_window_hours === "number" && r.alert_window_hours > 0
          ? r.alert_window_hours
          : DEFAULT_ALERT_RULES.alert_window_hours,
      notifyEmail: r.notify_email_enabled === true,
      notifyBanner: r.notify_dashboard_banner !== false,
      waPublicBackendUrl: typeof wa.public_backend_url === "string" ? wa.public_backend_url : "",
      waNotes: typeof wa.notes === "string" ? wa.notes : "",
    });
  }, []);

  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    setAuditError(null);
    const { data, error } = await supabase.rpc("staff_audit_logs_list", { p_limit: 150 });
    setAuditLoading(false);
    if (error) {
      setAuditError(error.message);
      setAuditRows([]);
      return;
    }
    setAuditRows((data ?? []) as AuditLogRow[]);
  }, []);

  useEffect(() => {
    if (navActive === "gestao" && session) void loadAuditLogs();
  }, [navActive, session, loadAuditLogs]);

  async function saveHospitalSettings() {
    if (!settingsHospitalId) {
      setSettingsMsg("Selecione um hospital.");
      return;
    }
    const meta = hospitalsMeta.find((h) => h.id === settingsHospitalId);
    const prev = meta?.alert_rules ?? {};
    const prevInt = meta?.integration_settings ?? {};
    const next: Record<string, unknown> = {
      ...prev,
      fever_celsius_min: settingsDraft.fever,
      alert_window_hours: settingsDraft.windowH,
      notify_email_enabled: settingsDraft.notifyEmail,
      notify_dashboard_banner: settingsDraft.notifyBanner,
    };
    const intBase =
      typeof prevInt === "object" && prevInt !== null && !Array.isArray(prevInt)
        ? { ...(prevInt as Record<string, unknown>) }
        : {};
    const nextIntegration: Record<string, unknown> = {
      ...intBase,
      whatsapp: {
        public_backend_url: settingsDraft.waPublicBackendUrl.trim(),
        notes: settingsDraft.waNotes.trim(),
      },
    };
    setSettingsBusy(true);
    setSettingsMsg(null);
    const { error } = await supabase
      .from("hospitals")
      .update({ alert_rules: next, integration_settings: nextIntegration })
      .eq("id", settingsHospitalId);
    setSettingsBusy(false);
    if (error) {
      setSettingsMsg(error.message);
      return;
    }
    setSettingsMsg("Alterações salvas. Triagem atualizada.");
    await loadTriage();
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (authBusy) return;
    setAuthError(null);
    setAuthInfo(null);
    setAuthBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setAuthBusy(false);
    if (error) setAuthError(formatAuthError(error));
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (authBusy) return;
    setAuthError(null);
    setAuthInfo(null);
    if (!fullName.trim()) {
      setAuthError("Informe o nome completo.");
      return;
    }
    setAuthBusy(true);
    setPendingStaffRole("hospital_admin");
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    if (error) {
      setAuthError(formatAuthError(error));
      setAuthBusy(false);
      return;
    }
    if (data.session) {
      setAuthInfo("Conta criada e vinculada ao hospital demo. Você já pode usar a triagem.");
      await ensureStaffIfPending(data.session);
    } else {
      setAuthInfo(
        "Enviamos um link de confirmação. Após confirmar o e-mail e entrar, seu perfil será vinculado ao hospital demo automaticamente."
      );
    }
    setAuthBusy(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setRows([]);
    setHospitalNames([]);
    setStaffProfile(null);
    setModalPatient(null);
    setModalCycles([]);
    setModalSymptoms([]);
    setFilterAlertOnly(false);
    setTriageRules(DEFAULT_ALERT_RULES);
    setHospitalsMeta([]);
    setAuditRows([]);
    setAuditSearch("");
    setMessagesFeed([]);
    navigate("/painel", { replace: true });
    setSettingsMsg(null);
    setChatSelectedPatientId(null);
    setChatContactsSearch("");
    setChatListFilter("all");
  }

  const filtered = useMemo(() => {
    if (!filterCancer) return rows;
    return rows.filter((r) => r.primary_cancer_type === filterCancer);
  }, [rows, filterCancer]);

  const searchFiltered = useMemo(() => {
    let list = filtered;
    if (filterAlertOnly) list = list.filter((r) => r.hasClinicalAlert);
    const q = patientSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => profileName(r.profiles).toLowerCase().includes(q));
  }, [filtered, patientSearch, filterAlertOnly]);

  const cancerOptions = useMemo(() => {
    const s = new Set(rows.map((r) => r.primary_cancer_type));
    return [...s].sort();
  }, [rows]);

  const stats = useMemo(() => {
    const critical = rows.filter((r) => r.risk >= 4).length;
    const high = rows.filter((r) => r.risk === 3).length;
    const nadir = rows.filter((r) => r.is_in_nadir).length;
    const clinicalAlert = rows.filter((r) => r.hasClinicalAlert).length;
    return { total: rows.length, critical, high, nadir, clinicalAlert };
  }, [rows]);

  const kpiStats = useMemo(
    () => ({
      total: rows.length,
      alerts24h: rows.filter((r) => r.hasAlert24h).length,
      criticalHigh: rows.filter((r) => r.risk >= 3).length,
      nadir: rows.filter((r) => r.is_in_nadir).length,
    }),
    [rows]
  );

  const auditFiltered = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    if (!q) return auditRows;
    return auditRows.filter(
      (a) =>
        (a.actor_name ?? "").toLowerCase().includes(q) ||
        (a.patient_name ?? "").toLowerCase().includes(q) ||
        a.action_type.toLowerCase().includes(q)
    );
  }, [auditRows, auditSearch]);

  const patientById = useMemo(() => {
    const m = new Map<string, RiskRow>();
    for (const r of rows) m.set(r.id, r);
    return m;
  }, [rows]);

  const chatContactsFiltered = useMemo(() => {
    const q = chatContactsSearch.trim().toLowerCase();
    let list = searchFiltered;
    if (q) list = list.filter((r) => profileName(r.profiles).toLowerCase().includes(q));
    return list;
  }, [searchFiltered, chatContactsSearch]);

  const chatMessagesForThread = useMemo(() => {
    if (!chatSelectedPatientId) return [];
    return messagesFeed
      .filter((m) => m.patient_id === chatSelectedPatientId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messagesFeed, chatSelectedPatientId]);

  const chatSelectedPatient = useMemo(() => {
    if (!chatSelectedPatientId) return null;
    return patientById.get(chatSelectedPatientId) ?? null;
  }, [chatSelectedPatientId, patientById]);

  const lastMessageByPatient = useMemo(() => {
    const m = new Map<string, MessageFeedRow>();
    for (const msg of messagesFeed) {
      const cur = m.get(msg.patient_id);
      if (!cur || new Date(msg.created_at) > new Date(cur.created_at)) m.set(msg.patient_id, msg);
    }
    return m;
  }, [messagesFeed]);

  const chatContactsForList = useMemo(() => {
    let list = chatContactsFiltered;
    if (chatListFilter === "alert") list = list.filter((r) => r.hasClinicalAlert);
    if (chatListFilter === "critical") list = list.filter((r) => triageEstadoChat(r).label === "Crítico");
    return list;
  }, [chatContactsFiltered, chatListFilter]);

  const chatContactsSorted = useMemo(() => {
    const list = [...chatContactsForList];
    list.sort((a, b) => {
      const ta = lastMessageByPatient.get(a.id)?.created_at;
      const tb = lastMessageByPatient.get(b.id)?.created_at;
      if (ta && tb) return new Date(tb).getTime() - new Date(ta).getTime();
      if (tb && !ta) return 1;
      if (ta && !tb) return -1;
      return profileName(a.profiles).localeCompare(profileName(b.profiles), "pt");
    });
    return list;
  }, [chatContactsForList, lastMessageByPatient]);

  const chatMessagesDisplay = useMemo(() => {
    const q = messagesSearch.trim().toLowerCase();
    let list = chatMessagesForThread;
    if (q) list = list.filter((m) => (m.body ?? "").toLowerCase().includes(q));
    return list;
  }, [chatMessagesForThread, messagesSearch]);

  const examBiomarkerGroups = useMemo(() => {
    const byDoc = new Map<string, BiomarkerModalRow[]>();
    const orphans: BiomarkerModalRow[] = [];
    for (const b of modalBiomarkers) {
      if (b.medical_document_id) {
        const list = byDoc.get(b.medical_document_id) ?? [];
        list.push(b);
        byDoc.set(b.medical_document_id, list);
      } else {
        orphans.push(b);
      }
    }
    return { byDoc, orphans };
  }, [modalBiomarkers]);

  const topPatient = searchFiltered[0];
  const welcomeName = firstName(staffProfile?.full_name ?? "");

  const goToPacientes = () => {
    navigate(tabToPath("pacientes"));
    setModalPatient(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (!sidebarExpanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarExpanded(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sidebarExpanded]);

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
    async (patientId: string, tab: ModalTabId = "mensagens") => {
      const existing = rows.find((x) => x.id === patientId);
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
        .select("id, primary_cancer_type, current_stage, is_in_nadir, profiles ( full_name, date_of_birth )")
        .eq("id", patientId)
        .maybeSingle();
      if (pe || !prow) return;
      const p = prow as PatientRow;
      const { data: logs, error: le } = await supabase
        .from("symptom_logs")
        .select("patient_id, severity, logged_at, symptom_category, body_temperature")
        .eq("patient_id", patientId)
        .gte("logged_at", sinceFetch.toISOString());
      if (le) return;
      const logRows = (logs ?? []) as SymptomLogTriage[];
      const rr = buildRiskRow(p, logRows, rules, nowMs);
      await openPatientModal(rr, tab);
    },
    [rows, triageRules, openPatientModal]
  );

  const staffUploadExam = useCallback(
    async (file: File) => {
      if (!session || !modalPatient || !backendUrl) {
        setStaffUploadMsg("Indique o URL do onco-backend (menu Integração ou variável VITE_BACKEND_URL) e selecione um paciente.");
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
        setStaffUploadMsg("Exame processado e registado no prontuário.");
        const pid = modalPatient.id;
        const [bio, mdocs] = await Promise.all([
          supabase
            .from("biomarker_logs")
            .select("id, medical_document_id, name, value_numeric, value_text, unit, is_abnormal, reference_alert, logged_at")
            .eq("patient_id", pid)
            .order("logged_at", { ascending: false })
            .limit(60),
          supabase
            .from("medical_documents")
            .select("id, document_type, uploaded_at, storage_path, mime_type")
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
      const j = (await r.json()) as { error?: string; message?: string; ok?: boolean };
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
        setDocOpenError("Indique o URL do onco-backend (menu Integração ou VITE_BACKEND_URL no .env).");
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
    void (async () => {
      const [cyc, sym, out, pat, bio, mdocs] = await Promise.all([
        supabase
          .from("treatment_cycles")
          .select("id, protocol_name, start_date, end_date, status")
          .eq("patient_id", modalPatient.id)
          .order("start_date", { ascending: false })
          .limit(36),
        supabase
          .from("symptom_logs")
          .select("id, symptom_category, severity, body_temperature, logged_at, notes")
          .eq("patient_id", modalPatient.id)
          .order("logged_at", { ascending: false })
          .limit(60),
        supabase
          .from("outbound_messages")
          .select("id, body, status, created_at, error_detail")
          .eq("patient_id", modalPatient.id)
          .order("created_at", { ascending: false })
          .limit(25),
        supabase
          .from("patients")
          .select("profiles ( phone_e164, whatsapp_opt_in_at, whatsapp_opt_in_revoked_at )")
          .eq("id", modalPatient.id)
          .single(),
        supabase
          .from("biomarker_logs")
          .select("id, medical_document_id, name, value_numeric, value_text, unit, is_abnormal, reference_alert, logged_at")
          .eq("patient_id", modalPatient.id)
          .order("logged_at", { ascending: false })
          .limit(60),
        supabase
          .from("medical_documents")
          .select("id, document_type, uploaded_at, storage_path, mime_type")
          .eq("patient_id", modalPatient.id)
          .order("uploaded_at", { ascending: false })
          .limit(40),
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
      setModalBiomarkers(
        !bio.error && bio.data
          ? (bio.data as Record<string, unknown>[]).map((row) => ({
              ...row,
              medical_document_id: (row.medical_document_id as string | null | undefined) ?? null,
            })) as BiomarkerModalRow[]
          : []
      );
      setModalMedicalDocs(!mdocs.error && mdocs.data ? (mdocs.data as MedicalDocModalRow[]) : []);
      setModalLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [modalPatient?.id]);

  useEffect(() => {
    if (!modalPatient) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalPatient(null);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modalCloseRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [modalPatient]);

  const triageActivityRows = useMemo(
    () =>
      searchFiltered.map((r) => (
        <button
          key={r.id}
          type="button"
          className="activity-row--action"
          role="listitem"
          onClick={() => void openPatientModal(r)}
        >
          <span className={dotClassForRisk(r.riskClass)} aria-hidden />
          <div className="activity-body">
            <strong>
              {profileName(r.profiles)}
              {r.hasClinicalAlert ? (
                <span className="alert-badge alert-badge--inline" title={r.alertReasons.join(" · ")}>
                  Alerta
                </span>
              ) : null}
            </strong>
            <span>
              {CANCER_PT[r.primary_cancer_type] ?? r.primary_cancer_type}
              {r.is_in_nadir ? " · Nadir" : ""}
            </span>
          </div>
          <div style={{ textAlign: "right" }}>
            <span className={`pill ${r.riskClass}`}>{r.riskLabel}</span>
            <div className="activity-date">{formatPtShort(r.lastSymptomAt)}</div>
          </div>
        </button>
      )),
    [searchFiltered, openPatientModal]
  );

  if (!session) {
    return (
      <div className="glass-root">
        <a href="#login-card" className="skip-link">
          Ir para o formulário
        </a>
        <div className="auth-shell">
          <div className="auth-card" id="login-card">
            <div className="brand" style={{ marginBottom: "0.5rem" }}>
              <div className="brand-mark">A</div>
              <div>
                <div className="brand-text">Aura Onco</div>
                <div className="brand-sub">Hospital</div>
              </div>
            </div>
            <h1>Acesso ao hospital</h1>
            <p className="muted">Conta de gestão: triagem e prontuário no hospital demo.</p>

            <div className="auth-tabs">
              <button type="button" className={authView === "login" ? "tab active" : "tab"} onClick={() => setAuthView("login")}>
                Entrar
              </button>
              <button type="button" className={authView === "cadastro" ? "tab active" : "tab"} onClick={() => setAuthView("cadastro")}>
                Cadastro
              </button>
            </div>

            {authView === "login" ? (
              <form onSubmit={signIn} className="form">
                <label>
                  E-mail
                  <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </label>
                <label>
                  Senha
                  <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </label>
                {authError ? <p className="error">{authError}</p> : null}
                {authInfo ? <p className="info">{authInfo}</p> : null}
                <button type="submit" disabled={authBusy}>
                  {authBusy ? "Aguarde…" : "Entrar"}
                </button>
              </form>
            ) : (
              <form onSubmit={signUp} className="form">
                <label>
                  Nome completo
                  <input type="text" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </label>
                <label>
                  E-mail
                  <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </label>
                <label>
                  Senha
                  <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </label>
                {authError ? <p className="error">{authError}</p> : null}
                {authInfo ? <p className="info">{authInfo}</p> : null}
                <button type="submit" disabled={authBusy}>
                  {authBusy ? "Criando conta…" : "Criar conta e vincular ao hospital demo"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  const renderMainNav = () => (
    <ul className="nav-list">
      <li>
        <button
          type="button"
          className={`nav-item ${navActive === "painel" ? "active" : ""}`}
          onClick={() => {
            navigate(tabToPath("painel"));
            setModalPatient(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <span className="nav-item__icon" aria-hidden>
            <IconDashboard />
          </span>
          <span className="nav-item__label">Painel</span>
        </button>
      </li>
      <li>
        <button type="button" className={`nav-item ${navActive === "pacientes" ? "active" : ""}`} onClick={goToPacientes}>
          <span className="nav-item__icon" aria-hidden>
            <IconUsers />
          </span>
          <span className="nav-item__label">Pacientes</span>
        </button>
      </li>
      <li>
        <button
          type="button"
          className={`nav-item ${navActive === "mensagens" ? "active" : ""}`}
          onClick={() => {
            navigate(tabToPath("mensagens"));
            setModalPatient(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <span className="nav-item__icon" aria-hidden>
            <IconMessages />
          </span>
          <span className="nav-item__label">Mensagens</span>
        </button>
      </li>
      <li>
        <button
          type="button"
          className={`nav-item ${navActive === "integracao" ? "active" : ""}`}
          onClick={() => {
            navigate(tabToPath("integracao"));
            setModalPatient(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <span className="nav-item__icon" aria-hidden>
            <IconIntegration />
          </span>
          <span className="nav-item__label">Integração</span>
        </button>
      </li>
      <li>
        <button
          type="button"
          className={`nav-item ${navActive === "gestao" ? "active" : ""}`}
          onClick={() => {
            navigate(tabToPath("gestao"));
            setModalPatient(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <span className="nav-item__icon" aria-hidden>
            <IconGestao />
          </span>
          <span className="nav-item__label">Gestão</span>
        </button>
      </li>
      <li>
        <button
          type="button"
          className={`nav-item ${navActive === "configuracoes" ? "active" : ""}`}
          onClick={() => {
            navigate(tabToPath("configuracoes"));
            setModalPatient(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
            const first = hospitalsMeta[0];
            if (first) {
              setSettingsHospitalId(first.id);
              hydrateSettingsFromHospital(first);
            }
          }}
        >
          <span className="nav-item__icon" aria-hidden>
            <IconSettings />
          </span>
          <span className="nav-item__label">Configurações</span>
        </button>
      </li>
    </ul>
  );

  const renderSidebarFoot = () => (
    <div className="sidebar-foot">
      {staffProfile ? (
        <>
          <strong>{staffProfile.full_name || "Conta"}</strong>
          <br />
          {roleLabel(staffProfile.role || "hospital_admin")}
          {hospitalNames.length ? (
            <>
              <br />
              {hospitalNames.join(" · ")}
            </>
          ) : null}
        </>
      ) : (
        "Carregando perfil…"
      )}
    </div>
  );

  return (
    <div className="glass-root">
      <a href="#conteudo-principal" className="skip-link">
        Ir para o conteúdo
      </a>
      <div
        className={`glass-app${sidebarExpanded ? " glass-app--sidebar-expanded" : " glass-app--sidebar-collapsed"}`}
      >
        <aside
          className={`glass-sidebar glass-panel${sidebarExpanded ? " glass-sidebar--expanded" : " glass-sidebar--collapsed"}`}
          id="shell-sidebar-nav"
          aria-label="Navegação principal"
        >
          <div className="glass-sidebar__header">
            <button
              type="button"
              className="sidebar-hamburger-btn"
              aria-expanded={sidebarExpanded}
              aria-controls="shell-sidebar-nav"
              onClick={() => setSidebarExpanded((v) => !v)}
              title={sidebarExpanded ? "Fechar menu" : "Abrir menu"}
            >
              <IconHamburger />
            </button>
            <div className="glass-sidebar__brand-titles">
              <div className="brand-mark">A</div>
              <div>
                <div className="brand-text">Aura Onco</div>
                <div className="brand-sub">Oncologia</div>
              </div>
            </div>
          </div>

          <nav className="glass-sidebar__nav" aria-label="Principal">
            {renderMainNav()}
          </nav>

          <div className="sidebar-bottom">
            <button type="button" className="nav-item nav-item--logout" onClick={() => void signOut()} title="Sair da conta">
              <span className="nav-item__icon" aria-hidden>
                <IconLogout />
              </span>
              <span className="nav-item__label">Sair</span>
            </button>
            {renderSidebarFoot()}
          </div>
        </aside>

        <main id="conteudo-principal" className="glass-main" tabIndex={-1} aria-busy={busy}>
          {busy ? (
            <div className="sync-strip" aria-hidden="true">
              <div className="sync-strip__bar" />
            </div>
          ) : null}
          <div className="main-header">
            <div>
              <h1 className="welcome-title">Olá, {welcomeName}</h1>
              <p className="welcome-sub">
                {navActive === "pacientes"
                  ? "Lista completa da lotação. Ao selecionar um paciente, registramos o acesso ao prontuário (auditoria HIPAA)."
                  : navActive === "mensagens"
                    ? "Contactos da lotação à esquerda; histórico de envios (Cloud API) e triagem. Use «Prontuário» para abrir o dossiê. «Ver conversa» mostra o fio local — ligue a Meta para mensagens em tempo real."
                    : navActive === "integracao"
                      ? "URLs públicas do backend e webhook Meta (Cloud API). Sem QR Code neste painel — configuração na Meta Business Suite. Valores por hospital em Configurações."
                      : navActive === "gestao"
                      ? "Indicadores da lotação e auditoria de acessos ao prontuário (HIPAA)."
                      : navActive === "configuracoes"
                        ? "Ajuste limites de triagem e URLs de integração por hospital. Alterações refletem na lista após salvar."
                        : `${roleLabel(staffProfile?.role ?? "hospital_admin")} · Resumo da lotação · Risco 7 dias · alertas ${triageRules.alert_window_hours}h · ${
                            hospitalNames.length ? hospitalNames.join(", ") : "Hospital não identificado"
                          }`}
              </p>
              <div className="header-meta">
                {navActive === "mensagens" ? (
                  <>
                    <span className="meta-chip meta-chip--live">Mensagens</span>
                    <span className="meta-chip">
                      Registos <strong>{messagesFeed.length}</strong>
                    </span>
                  </>
                ) : navActive === "integracao" ? (
                  <>
                    <span className="meta-chip meta-chip--live">Meta / Webhook</span>
                    <span className="meta-chip">
                      Hospitais <strong>{hospitalsMeta.length}</strong>
                    </span>
                  </>
                ) : navActive === "gestao" ? (
                  <>
                    <span className="meta-chip meta-chip--live">Gestão</span>
                    <span className="meta-chip">
                      Pacientes <strong>{kpiStats.total}</strong>
                    </span>
                    <span className="meta-chip">
                      Alertas 24h <strong>{kpiStats.alerts24h}</strong>
                    </span>
                  </>
                ) : navActive === "configuracoes" ? (
                  <>
                    <span className="meta-chip">Institucional</span>
                    <span className="meta-chip">
                      Hospitais na lotação <strong>{hospitalsMeta.length}</strong>
                    </span>
                  </>
                ) : navActive === "pacientes" ? (
                  <>
                    <span className="meta-chip">Pacientes</span>
                    <span className="meta-chip">
                      Na lista <strong>{searchFiltered.length}</strong>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="meta-chip meta-chip--live">Painel</span>
                    <span className="meta-chip">
                      Risco <strong>7 dias</strong>
                    </span>
                    <span className="meta-chip">
                      Na lista <strong>{searchFiltered.length}</strong>
                      {stats.clinicalAlert ? (
                        <>
                          {" "}
                          · alerta <strong>{stats.clinicalAlert}</strong>
                        </>
                      ) : null}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="header-actions">
              <button type="button" className="btn-ghost" onClick={() => void loadTriage()} disabled={busy}>
                {busy ? "Atualizando…" : "Atualizar dados"}
              </button>
            </div>
          </div>

          {loadError ? (
            <p className="error" role="alert">
              {loadError}
            </p>
          ) : null}

          {navActive === "pacientes" ? (
            <section className="patients-shell" aria-labelledby="patients-title">
              <h2 id="patients-title" className="section-title" style={{ marginTop: 0 }}>
                Pacientes ({searchFiltered.length})
              </h2>
              {busy ? (
                <p className="muted">Carregando…</p>
              ) : searchFiltered.length === 0 ? (
                <div className="glass-panel" style={{ padding: "1.5rem" }}>
                  <p className="muted" style={{ margin: 0 }}>
                    Nenhum paciente encontrado. Ajuste a busca ou o filtro de tumor à direita.
                  </p>
                </div>
              ) : (
                <>
                  <div className="patients-table-wrap">
                    <table className="patients-table">
                      <thead>
                        <tr>
                          <th>Paciente</th>
                          <th>Alerta</th>
                          <th>Tumor</th>
                          <th>Nadir</th>
                          <th>Risco (7 dias)</th>
                          <th>Último sintoma</th>
                        </tr>
                      </thead>
                      <tbody>
                        {searchFiltered.map((r) => (
                          <tr
                            key={r.id}
                            className={modalPatient?.id === r.id ? "selected" : undefined}
                            onClick={() => void openPatientModal(r)}
                          >
                            <td>
                              <strong>{profileName(r.profiles)}</strong>
                            </td>
                            <td>
                              {r.hasClinicalAlert ? (
                                <span className="alert-badge" title={r.alertReasons.join(" · ")}>
                                  Sim
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td>{CANCER_PT[r.primary_cancer_type] ?? r.primary_cancer_type}</td>
                            <td>{r.is_in_nadir ? "Sim" : "Não"}</td>
                            <td>
                              <span className={`pill ${r.riskClass}`}>{r.riskLabel}</span>
                            </td>
                            <td>{formatPtShort(r.lastSymptomAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          ) : navActive === "mensagens" ? (
            <section className="chat-tab-shell" aria-labelledby="msgs-title">
              <div className="chat-tab-intro">
                <h2 id="msgs-title" className="section-title" style={{ marginTop: 0 }}>
                  Mensagens
                </h2>
                <p className="muted chat-tab-intro__sub">
                  Lista à esquerda com pré-visualização e triagem; conversa à direita (envios via backend). O envio em tempo real fica
                  disponível após configurar a Cloud API Meta.
                </p>
              </div>
              {busy ? (
                <p className="muted">Carregando…</p>
              ) : (
                <div className="chat-split glass-panel">
                  <aside className="chat-sidebar" aria-label="Pacientes">
                    <div className="chat-sidebar__search search-wrap">
                      <input
                        type="search"
                        placeholder="Procurar paciente…"
                        value={chatContactsSearch}
                        onChange={(e) => setChatContactsSearch(e.target.value)}
                        aria-label="Filtrar lista de pacientes"
                      />
                    </div>
                    <div className="chat-filter-pills" role="tablist" aria-label="Filtrar lista">
                      {(
                        [
                          ["all", "Todos"],
                          ["alert", "Alertas"],
                          ["critical", "Críticos"],
                        ] as const
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          role="tab"
                          aria-selected={chatListFilter === id}
                          className={`chat-filter-pill ${chatListFilter === id ? "is-active" : ""}`}
                          onClick={() => setChatListFilter(id)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <ul className="chat-contacts-list">
                      {chatContactsSorted.map((r) => {
                        const est = triageEstadoChat(r);
                        const last = lastMessageByPatient.get(r.id);
                        const raw = (last?.body ?? "").trim();
                        const preview = last
                          ? raw
                            ? raw.length > 56
                              ? `${raw.slice(0, 56)}…`
                              : raw
                            : "(sem texto)"
                          : "Sem mensagens ainda";
                        return (
                          <li key={r.id}>
                            <button
                              type="button"
                              className={`chat-contact-row ${chatSelectedPatientId === r.id ? "is-active" : ""}`}
                              data-estado={est.cls}
                              onClick={() => setChatSelectedPatientId(r.id)}
                            >
                              <span className={`chat-contact-avatar chat-contact-avatar--round ${r.riskClass}`} aria-hidden>
                                {initialsFromName(profileName(r.profiles))}
                              </span>
                              <span className="chat-contact-main">
                                <span className="chat-contact-line1">
                                  <span className="chat-contact-name">{profileName(r.profiles)}</span>
                                  {last ? (
                                    <time className="chat-contact-time" dateTime={last.created_at}>
                                      {formatPtTimeShort(last.created_at)}
                                    </time>
                                  ) : null}
                                </span>
                                <span className="chat-contact-line2">
                                  <span className="chat-contact-preview muted">{preview}</span>
                                  <span className={`chat-contact-dot ${est.cls}`} title={est.label} aria-hidden />
                                </span>
                              </span>
                              {r.hasClinicalAlert ? (
                                <span className="chat-contact-alert" title={r.alertReasons.join(" · ")} aria-label="Alerta clínico">
                                  !
                                </span>
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    {chatContactsSorted.length === 0 ? (
                      <p className="muted chat-contacts-empty">Nenhum paciente corresponde ao filtro.</p>
                    ) : null}
                  </aside>

                  <div className="chat-conversation">
                    {!chatSelectedPatientId || !chatSelectedPatient ? (
                      <div className="chat-empty-pane">
                        <p className="chat-empty-pane__title">Selecione um paciente</p>
                        <p className="muted chat-empty-pane__text">
                          Escolha um contacto na lista para ver o histórico de envios (WhatsApp Cloud API) e a triagem.
                        </p>
                      </div>
                    ) : (
                      <>
                        <header className="chat-conv-header">
                          <div className="chat-conv-header__person">
                            <span
                              className={`chat-contact-avatar chat-contact-avatar--round chat-conv-header__avatar ${chatSelectedPatient.riskClass}`}
                              aria-hidden
                            >
                              {initialsFromName(profileName(chatSelectedPatient.profiles))}
                            </span>
                            <div className="chat-conv-header__text">
                              <h3 className="chat-conv-header__name">{profileName(chatSelectedPatient.profiles)}</h3>
                              <p className="chat-conv-header__meta muted">
                                <span className={`pill pill--compact ${triageEstadoChat(chatSelectedPatient).cls}`}>
                                  {triageEstadoChat(chatSelectedPatient).label}
                                </span>
                                <span> · {CANCER_PT[chatSelectedPatient.primary_cancer_type] ?? chatSelectedPatient.primary_cancer_type}</span>
                                {chatSelectedPatient.hasClinicalAlert ? (
                                  <span className="alert-badge" style={{ marginLeft: "0.35rem" }}>
                                    Alerta
                                  </span>
                                ) : null}
                              </p>
                            </div>
                          </div>
                          <div className="chat-conv-header__actions">
                            <button
                              type="button"
                              className="btn-chat-header"
                              title="Abrir prontuário"
                              onClick={() => void openPatientById(chatSelectedPatient.id, "mensagens")}
                            >
                              <IconUserCircle />
                              <span>Prontuário</span>
                            </button>
                          </div>
                        </header>

                        <div className="chat-thread-toolbar search-wrap">
                          <input
                            type="search"
                            placeholder="Filtrar texto nesta conversa…"
                            value={messagesSearch}
                            onChange={(e) => setMessagesSearch(e.target.value)}
                            aria-label="Filtrar mensagens desta conversa"
                          />
                        </div>

                        <div className="chat-messages-scroll">
                          {chatMessagesDisplay.length === 0 ? (
                            <p className="muted chat-messages-empty">
                              {chatMessagesForThread.length === 0
                                ? "Nenhum envio registado para este paciente. Após integrar a Meta, as mensagens aparecerão aqui."
                                : "Nenhuma mensagem corresponde ao filtro de texto."}
                            </p>
                          ) : (
                            chatMessagesDisplay.map((m, i) => {
                              const prev = i > 0 ? chatMessagesDisplay[i - 1] : null;
                              const showDay = !prev || chatDayKey(m.created_at) !== chatDayKey(prev.created_at);
                              return (
                                <Fragment key={m.id}>
                                  {showDay ? (
                                    <div className="chat-day-divider" role="presentation">
                                      <span>{formatChatDayLabel(m.created_at)}</span>
                                    </div>
                                  ) : null}
                                  <div className="chat-msg-row chat-msg-row--out">
                                    <div className="chat-bubble chat-bubble--out">
                                      <p className="chat-bubble__text">{m.body ?? "—"}</p>
                                      <div className="chat-bubble__foot">
                                        <time dateTime={m.created_at}>{formatPtTimeShort(m.created_at)}</time>
                                        <span
                                          className={`pill pill--compact ${m.status === "failed" ? "risk-critical" : "risk-low"}`}
                                        >
                                          {OUTBOUND_STATUS_PT[m.status] ?? m.status}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </Fragment>
                              );
                            })
                          )}
                        </div>

                        <footer className="chat-composer">
                          <label className="chat-composer__inner">
                            <span className="visually-hidden">Campo de mensagem (desativado até integração Meta)</span>
                            <input
                              type="text"
                              className="chat-composer__input"
                              disabled
                              readOnly
                              placeholder="Envio via Cloud API Meta (configure o backend e o número)…"
                              value=""
                            />
                            <button type="button" className="chat-composer__send" disabled title="Disponível após integração Meta">
                              <IconSend />
                            </button>
                          </label>
                          <p className="chat-composer__hint muted">
                            Os envios institucionais são registados pelo onco-backend. Mensagens em tempo real exigem app e webhook
                            configurados na Meta Business Suite.
                          </p>
                        </footer>
                      </>
                    )}
                  </div>
                </div>
              )}
            </section>
          ) : navActive === "integracao" ? (
            <section className="settings-shell" aria-labelledby="integr-title">
              <h2 id="integr-title" className="section-title" style={{ marginTop: 0 }}>
                Integração WhatsApp (Meta)
              </h2>
              <div className="glass-panel" style={{ padding: "1.25rem" }}>
                <p className="muted" style={{ marginTop: 0, lineHeight: 1.5 }}>
                  A ligação oficial faz-se no <strong>Meta Business Suite</strong>. <strong>Não há QR Code neste painel</strong> — o QR
                  existe só na app WhatsApp Business no telefone. Cole o callback abaixo em Webhooks na consola Meta.
                </p>
                <div className="glass-panel settings-form" style={{ marginBottom: "1rem", padding: "1rem" }}>
                  <h3 className="section-title" style={{ marginTop: 0 }}>
                    URL do onco-backend
                  </h3>
                  <p className="muted" style={{ marginTop: 0, fontSize: "0.9rem", lineHeight: 1.45 }}>
                    Necessário para pré-visualizar o webhook e para chamadas do dashboard ao API. Adicione{" "}
                    <code className="patient-modal__code">VITE_BACKEND_URL=http://localhost:3001</code> ao ficheiro{" "}
                    <code className="patient-modal__code">hospital-dashboard/.env</code> e reinicie o servidor de desenvolvimento, ou
                    introduza o URL abaixo e clique <strong>Aplicar</strong> (guardado neste navegador até fechar o separador).
                  </p>
                  <label className="settings-field">
                    URL base do backend
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", marginTop: "0.35rem" }}>
                      <input
                        type="url"
                        style={{ flex: 1, minWidth: "12rem" }}
                        autoComplete="off"
                        placeholder="http://localhost:3001"
                        value={backendUrlInput}
                        onChange={(e) => setBackendUrlInput(e.target.value)}
                      />
                      <button type="button" className="btn-solid" onClick={applyBackendUrlFromInput}>
                        Aplicar
                      </button>
                    </div>
                  </label>
                  <p className="muted" style={{ marginBottom: 0, fontSize: "0.85rem" }}>
                    {envBackendUrl
                      ? `Do .env: ${envBackendUrl}${backendUrlSession ? " · Valor da sessão do navegador tem prioridade." : ""}`
                      : "Sem VITE_BACKEND_URL no .env — use o campo acima ou crie/edite o .env."}
                  </p>
                </div>
                {hospitalsMeta.length === 0 ? (
                  <p className="muted">Carregue os dados (triagem) ou verifique a lotação.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {hospitalsMeta.map((h) => {
                      const waRaw = h.integration_settings?.whatsapp;
                      const wa =
                        typeof waRaw === "object" && waRaw !== null && !Array.isArray(waRaw)
                          ? (waRaw as Record<string, unknown>)
                          : {};
                      const base = (typeof wa.public_backend_url === "string" ? wa.public_backend_url : "").trim() || backendUrl;
                      const path = base ? `${base.replace(/\/$/, "")}/api/whatsapp/webhook` : "";
                      const notes = typeof wa.notes === "string" ? wa.notes : "";
                      return (
                        <div key={h.id} className="glass-panel" style={{ padding: "1rem", background: "rgba(255,255,255,0.5)" }}>
                          <h3 className="section-title" style={{ marginTop: 0 }}>
                            {h.name}
                          </h3>
                          {path ? (
                            <div style={{ marginBottom: notes ? "0.75rem" : 0 }}>
                              <span className="muted" style={{ fontSize: "0.85rem" }}>
                                Callback (Webhooks)
                              </span>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "0.5rem",
                                  flexWrap: "wrap",
                                  alignItems: "center",
                                  marginTop: "0.35rem",
                                }}
                              >
                                <code
                                  style={{
                                    wordBreak: "break-all",
                                    flex: 1,
                                    minWidth: "12rem",
                                    fontSize: "0.8rem",
                                    padding: "0.35rem 0.5rem",
                                    borderRadius: 8,
                                    background: "rgba(0,0,0,0.06)",
                                  }}
                                >
                                  {path}
                                </code>
                                <button type="button" className="btn-ghost" onClick={() => void navigator.clipboard.writeText(path)}>
                                  Copiar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="muted">
                              Sem URL: preencha o bloco &quot;URL do onco-backend&quot; acima ou a URL pública do hospital em Configurações
                              (gestor).
                            </p>
                          )}
                          {notes ? (
                            <p className="muted" style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>
                              {notes}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="muted" style={{ marginTop: "1rem", marginBottom: 0 }}>
                  Para editar URL e notas por hospital (persistidas na base), use o menu <strong>Configurações</strong>.
                </p>
              </div>
            </section>
          ) : navActive === "gestao" ? (
            <section className="gestao-shell" aria-labelledby="gestao-title">
              <h2 id="gestao-title" className="section-title" style={{ marginTop: 0 }}>
                Painel de gestão
              </h2>
              {busy ? (
                <p className="muted">Carregando indicadores…</p>
              ) : (
                <>
                  <div className="kpi-grid">
                    <div className="kpi-card glass-panel">
                      <span className="kpi-card__label">Pacientes na lotação</span>
                      <strong className="kpi-card__value">{kpiStats.total}</strong>
                    </div>
                    <div className="kpi-card glass-panel">
                      <span className="kpi-card__label">Alertas clínicos (24 h)</span>
                      <strong className="kpi-card__value">{kpiStats.alerts24h}</strong>
                    </div>
                    <div className="kpi-card glass-panel">
                      <span className="kpi-card__label">Risco alto ou crítico (7 d)</span>
                      <strong className="kpi-card__value">{kpiStats.criticalHigh}</strong>
                    </div>
                    <div className="kpi-card glass-panel">
                      <span className="kpi-card__label">Em nadir</span>
                      <strong className="kpi-card__value">{kpiStats.nadir}</strong>
                    </div>
                  </div>

                  <div className="glass-panel" style={{ padding: "1rem", marginTop: "1.25rem" }}>
                    <h3 className="section-title" style={{ marginTop: 0 }}>
                      Auditoria de acessos
                    </h3>
                    <p className="muted" style={{ marginTop: 0, fontSize: "0.9rem" }}>
                      Eventos registrados ao abrir o prontuário a partir deste dashboard.
                    </p>
                    <div className="search-wrap" style={{ marginBottom: "0.75rem", maxWidth: "22rem" }}>
                      <input
                        type="search"
                        placeholder="Filtrar por paciente, profissional ou ação…"
                        value={auditSearch}
                        onChange={(e) => setAuditSearch(e.target.value)}
                        aria-label="Filtrar auditoria"
                      />
                    </div>
                    {auditLoading ? (
                      <p className="muted">Carregando auditoria…</p>
                    ) : auditError ? (
                      <p className="error" role="alert">
                        {auditError}
                      </p>
                    ) : (
                      <div className="audit-table-wrap">
                        <table className="audit-table">
                          <thead>
                            <tr>
                              <th>Quando</th>
                              <th>Ação</th>
                              <th>Paciente</th>
                              <th>Profissional</th>
                            </tr>
                          </thead>
                          <tbody>
                            {auditFiltered.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="muted">
                                  Nenhum evento encontrado.
                                </td>
                              </tr>
                            ) : (
                              auditFiltered.map((a) => (
                                <tr key={a.id}>
                                  <td>{formatPtDateTime(a.ts)}</td>
                                  <td>{AUDIT_ACTION_PT[a.action_type] ?? a.action_type}</td>
                                  <td>{a.patient_name || "—"}</td>
                                  <td>{a.actor_name || "—"}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          ) : navActive === "configuracoes" ? (
            <section className="settings-shell" aria-labelledby="settings-title">
              <h2 id="settings-title" className="section-title" style={{ marginTop: 0 }}>
                Configurações institucionais
              </h2>
              {hospitalsMeta.length === 0 ? (
                <div className="glass-panel" style={{ padding: "1.5rem" }}>
                  <p className="muted" style={{ margin: 0 }}>
                    Carregue os dados (triagem) ou verifique sua lotação em staff_assignments.
                  </p>
                </div>
              ) : (
                <div className="glass-panel settings-form">
                  <div className="glass-panel" style={{ padding: "1rem", marginBottom: "1rem", background: "rgba(255,255,255,0.45)" }}>
                    <h3 className="section-title" style={{ marginTop: 0 }}>
                      URL do onco-backend (este navegador)
                    </h3>
                    <p className="muted" style={{ marginTop: 0, fontSize: "0.9rem" }}>
                      O mesmo que em <strong>Integração</strong>: necessário para pré-visualizar webhook e testar OCR/WhatsApp a partir do
                      dashboard sem novo build.
                    </p>
                    <label className="settings-field">
                      URL base
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", marginTop: "0.35rem" }}>
                        <input
                          type="url"
                          style={{ flex: 1, minWidth: "12rem" }}
                          autoComplete="off"
                          placeholder="http://localhost:3001"
                          value={backendUrlInput}
                          onChange={(e) => setBackendUrlInput(e.target.value)}
                        />
                        <button type="button" className="btn-solid" onClick={applyBackendUrlFromInput}>
                          Aplicar
                        </button>
                      </div>
                    </label>
                    <p className="muted" style={{ marginBottom: 0, fontSize: "0.85rem" }}>
                      {envBackendUrl ? `VITE_BACKEND_URL no .env: ${envBackendUrl}` : "Sem VITE_BACKEND_URL no .env."}
                    </p>
                  </div>
                  <div className="queue-select-wrap">
                    <label htmlFor="settings-hospital">Hospital</label>
                    <select
                      id="settings-hospital"
                      value={settingsHospitalId ?? hospitalsMeta[0].id}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSettingsHospitalId(id);
                        const h = hospitalsMeta.find((x) => x.id === id);
                        if (h) hydrateSettingsFromHospital(h);
                      }}
                      aria-label="Hospital para editar regras"
                    >
                      {hospitalsMeta.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="settings-field">
                    Febre mínima para alerta (°C)
                    <input
                      type="number"
                      step="0.1"
                      min={35}
                      max={42}
                      value={settingsDraft.fever}
                      onChange={(e) =>
                        setSettingsDraft((d) => ({ ...d, fever: parseFloat(e.target.value) || DEFAULT_ALERT_RULES.fever_celsius_min }))
                      }
                    />
                  </label>
                  <label className="settings-field">
                    Janela de alertas (horas)
                    <input
                      type="number"
                      step={1}
                      min={12}
                      max={336}
                      value={settingsDraft.windowH}
                      onChange={(e) =>
                        setSettingsDraft((d) => ({ ...d, windowH: parseInt(e.target.value, 10) || DEFAULT_ALERT_RULES.alert_window_hours }))
                      }
                    />
                  </label>
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={settingsDraft.notifyBanner}
                      onChange={(e) => setSettingsDraft((d) => ({ ...d, notifyBanner: e.target.checked }))}
                    />
                    Destaque de alertas no painel (registrado no JSON; integrações futuras)
                  </label>
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={settingsDraft.notifyEmail}
                      onChange={(e) => setSettingsDraft((d) => ({ ...d, notifyEmail: e.target.checked }))}
                    />
                    Opt-in e-mail para alertas (somente preferência; envio na Sprint 4)
                  </label>

                  <hr style={{ margin: "1.35rem 0", border: "none", borderTop: "1px solid rgba(0,0,0,0.08)" }} />
                  <h3 className="section-title" style={{ marginTop: 0 }}>
                    WhatsApp Cloud API (Meta)
                  </h3>
                  <p className="muted" style={{ marginTop: 0, fontSize: "0.9rem", lineHeight: 1.45 }}>
                    A ligação à Meta faz-se no <strong>Meta Business Suite</strong> (app ou número de teste).{" "}
                    <strong>Não há QR Code neste painel</strong> — o QR aparece apenas na app WhatsApp Business no telefone. Aqui
                    regista a URL pública HTTPS do <code className="patient-modal__code">onco-backend</code> para copiar o callback do
                    webhook e notas internas.
                  </p>
                  <label className="settings-field">
                    URL pública do backend (sem barra no fim)
                    <input
                      type="url"
                      autoComplete="off"
                      placeholder="https://api.seudominio.com"
                      value={settingsDraft.waPublicBackendUrl}
                      onChange={(e) => setSettingsDraft((d) => ({ ...d, waPublicBackendUrl: e.target.value }))}
                    />
                  </label>
                  <label className="settings-field">
                    Notas internas (opcional)
                    <textarea
                      rows={2}
                      value={settingsDraft.waNotes}
                      onChange={(e) => setSettingsDraft((d) => ({ ...d, waNotes: e.target.value }))}
                      placeholder="Ex.: número de teste Meta, responsável, data de go-live…"
                    />
                  </label>
                  {(() => {
                    const base = settingsDraft.waPublicBackendUrl.trim() || backendUrl;
                    const path = base ? `${base.replace(/\/$/, "")}/api/whatsapp/webhook` : "";
                    return path ? (
                      <div className="settings-field" style={{ marginTop: "0.5rem" }}>
                        <span className="muted" style={{ fontSize: "0.85rem" }}>
                          Callback URL (cole em Meta → Webhooks)
                        </span>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", marginTop: "0.35rem" }}>
                          <code
                            style={{
                              flex: 1,
                              minWidth: "12rem",
                              wordBreak: "break-all",
                              fontSize: "0.8rem",
                              padding: "0.35rem 0.5rem",
                              borderRadius: 8,
                              background: "rgba(0,0,0,0.06)",
                            }}
                          >
                            {path}
                          </code>
                          <button type="button" className="btn-ghost" onClick={() => void navigator.clipboard.writeText(path)}>
                            Copiar
                          </button>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {settingsMsg ? (
                    <p className={settingsMsg.startsWith("Alterações") ? "info" : "error"} style={{ marginTop: "0.75rem" }}>
                      {settingsMsg}
                    </p>
                  ) : null}
                  <button type="button" className="btn-solid" disabled={settingsBusy} onClick={() => void saveHospitalSettings()}>
                    {settingsBusy ? "Salvando…" : "Salvar alterações"}
                  </button>
                </div>
              )}
            </section>
          ) : (
            <>
          <section className={`hero-card ${!topPatient ? "hero-empty" : ""}`} aria-labelledby="hero-title">
            <div className="hero-card__bg" />
            <div className="hero-card__inner">
              {topPatient ? (
                <>
                  <div className="hero-kicker">Prioridade na triagem</div>
                  <h2 id="hero-title" className="hero-name">
                    {profileName(topPatient.profiles)}
                    {topPatient.hasClinicalAlert ? (
                      <span className="alert-badge alert-badge--inline" title={topPatient.alertReasons.join(" · ")}>
                        Alerta
                      </span>
                    ) : null}
                  </h2>
                  <div className="hero-meta">
                    <span className="hero-pill">{CANCER_PT[topPatient.primary_cancer_type] ?? topPatient.primary_cancer_type}</span>
                    <span className="hero-pill">{topPatient.is_in_nadir ? "Nadir — vigilância" : "Fora de nadir"}</span>
                    <span className="hero-pill">
                      Último sintoma: {formatPtShort(topPatient.lastSymptomAt)} · {topPatient.riskLabel}
                    </span>
                  </div>
                </>
              ) : (
                <div className="hero-empty">
                  <div className="hero-kicker">Nenhum paciente na fila</div>
                  <h2 id="hero-title" className="hero-name">
                    {busy ? "Carregando triagem…" : "Sem registros com os filtros atuais"}
                  </h2>
                  <p style={{ opacity: 0.9, fontSize: "0.9rem", margin: 0 }}>
                    Pacientes do app aparecem aqui conforme a lotação hospitalar e o diário de sintomas.
                  </p>
                </div>
              )}
            </div>
          </section>

          <div>
            <p className="quick-label">Ações rápidas</p>
            <div className="quick-row">
              <button type="button" className="quick-btn" title="Atualizar triagem" onClick={() => void loadTriage()} disabled={busy}>
                <IconActivity />
              </button>
              <button
                type="button"
                className="quick-btn"
                title="Limpar filtro de tumor"
                onClick={() => {
                  setFilterCancer("");
                  setPatientSearch("");
                  setFilterAlertOnly(false);
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
              </button>
              <button type="button" className="quick-btn" title="Abrir lista de pacientes" onClick={goToPacientes}>
                <IconUsers />
              </button>
            </div>
          </div>

          <div className="lower-grid">
            <div>
              <h3 className="section-title">Cuidados em oncologia</h3>
              <div className="tips-list">
                {CARE_TIPS.map((t) => (
                  <div key={t.title} className="tip-card glass-panel glass-panel--tight">
                    <div className="tip-thumb" aria-hidden>
                      {t.emoji}
                    </div>
                    <div>
                      <h3>{t.title}</h3>
                      <p>{t.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="activity-panel glass-panel">
              <h3 className="section-title">Triagem (risco 7 dias · alertas {triageRules.alert_window_hours}h)</h3>
              <p className="activity-hint">Resumo no painel — fila completa na aba Triagem.</p>
              <div className="activity-list" role="list">
                {triageActivityRows}
              </div>
              {searchFiltered.length === 0 && !busy ? (
                <p className="empty-hint">Nenhum paciente com os filtros atuais. Ajuste o tumor à direita ou a busca.</p>
              ) : null}
            </div>
          </div>
            </>
          )}
        </main>

        <aside className="glass-aside">
          <div className="glass-panel" style={{ padding: "1rem" }}>
            <div className="search-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                placeholder="Buscar paciente…"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                aria-label="Buscar paciente por nome"
              />
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "1rem" }}>
            <h3 className="section-title">Alertas na lista</h3>
            <div className="queue-select-wrap" style={{ marginTop: "0.35rem" }}>
              <label htmlFor="filter-alert">Mostrar</label>
              <select
                id="filter-alert"
                value={filterAlertOnly ? "alert" : "all"}
                onChange={(e) => setFilterAlertOnly(e.target.value === "alert")}
                aria-label="Filtrar pacientes com alerta clínico"
              >
                <option value="all">Todos</option>
                <option value="alert">Só com alerta</option>
              </select>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "1rem" }}>
            <h3 className="section-title">Filtrar por tumor</h3>
            <div className="specialty-grid">
              <button
                type="button"
                className={`specialty-btn ${filterCancer === "" ? "active" : ""}`}
                onClick={() => setFilterCancer("")}
              >
                <span className="emoji" aria-hidden>
                  ⊕
                </span>
                Todos
              </button>
              {cancerOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`specialty-btn ${filterCancer === c ? "active" : ""}`}
                  onClick={() => setFilterCancer(c)}
                >
                  <span className="emoji" aria-hidden>
                    {CANCER_EMOJI[c] ?? "🧬"}
                  </span>
                  {CANCER_PT[c] ?? c}
                </button>
              ))}
            </div>
          </div>

          <div className="queue-panel glass-panel">
            <div className="queue-select-wrap">
              <label htmlFor="queue-hosp">Sua lotação</label>
              <select
                id="queue-hosp"
                value={hospitalNames[0] ?? ""}
                onChange={() => {}}
                aria-label="Hospitais da lotação (somente leitura)"
                disabled={hospitalNames.length <= 1}
              >
                {hospitalNames.length === 0 ? <option value="">—</option> : null}
                {hospitalNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="queue-stats">
              <div className="queue-stat">
                <strong>{stats.total}</strong>
                <span>Pacientes</span>
              </div>
              <div className="queue-stat">
                <strong>{stats.clinicalAlert}</strong>
                <span>Alerta clínico</span>
              </div>
              <div className="queue-stat">
                <strong>{stats.nadir}</strong>
                <span>Nadir</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {modalPatient ? (
        <div className="patient-modal-backdrop" onClick={() => setModalPatient(null)}>
          <div
            className="patient-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="patient-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="patient-modal__head">
              <div className="patient-modal__identity">
                <div className="patient-modal__avatar" aria-hidden>
                  {initialsFromName(profileName(modalPatient.profiles))}
                </div>
                <div>
                  <h2 id="patient-modal-title" className="patient-modal__name">
                    {profileName(modalPatient.profiles)}
                  </h2>
                  <p className="patient-modal__meta">
                    {ageFromDob(profileDob(modalPatient.profiles)) ?? "Idade não informada"}
                    {modalPatient.current_stage ? ` · Estágio: ${modalPatient.current_stage}` : ""}
                  </p>
                </div>
              </div>
              <button
                ref={modalCloseRef}
                type="button"
                className="patient-modal__close"
                onClick={() => setModalPatient(null)}
              >
                Fechar
              </button>
            </div>

            <div className="patient-modal__tabs" role="tablist" aria-label="Secções do prontuário">
              {(Object.keys(MODAL_TAB_LABEL) as ModalTabId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={modalTab === id}
                  className={`patient-modal__tab ${modalTab === id ? "is-active" : ""}`}
                  onClick={() => setModalTab(id)}
                >
                  {MODAL_TAB_LABEL[id]}
                </button>
              ))}
            </div>

            <div className="patient-modal__scroll">
            {modalTab === "resumo" ? (
              <div className="patient-modal__tab-panel">
            <div className="patient-modal__grid">
              <div className="patient-modal__card">
                <h3 className="patient-modal__label">Tumor</h3>
                <p className="patient-modal__value">{CANCER_PT[modalPatient.primary_cancer_type] ?? modalPatient.primary_cancer_type}</p>
              </div>
              <div className="patient-modal__card">
                <h3 className="patient-modal__label">Nadir</h3>
                <p className="patient-modal__value">{modalPatient.is_in_nadir ? "Sim — vigilância febril" : "Não"}</p>
              </div>
              <div className="patient-modal__card">
                <h3 className="patient-modal__label">Risco (triagem 7 dias)</h3>
                <p className="patient-modal__value">
                  <span className={`pill ${modalPatient.riskClass}`}>{modalPatient.riskLabel}</span>
                </p>
              </div>
              <div className="patient-modal__card">
                <h3 className="patient-modal__label">Alerta clínico ({triageRules.alert_window_hours}h)</h3>
                <p className="patient-modal__value">
                  {modalPatient.hasClinicalAlert ? (
                    <>
                      <span className="alert-badge">Sim</span>
                      <span className="muted" style={{ display: "block", marginTop: "0.35rem", fontSize: "0.85rem" }}>
                        {modalPatient.alertReasons.join(" · ")}
                      </span>
                    </>
                  ) : (
                    "Sem critérios na janela atual"
                  )}
                </p>
              </div>
            </div>

            <section className="patient-modal__section">
              <h3 className="patient-modal__section-title">Histórico de quimioterapia</h3>
              {modalLoading ? (
                <p className="muted patient-modal__loading">Carregando…</p>
              ) : modalError ? (
                <p className="error">{modalError}</p>
              ) : modalCycles.length === 0 ? (
                <p className="patient-modal__empty-hint">Nenhum ciclo registrado no sistema.</p>
              ) : (
                <div className="patient-modal__table-wrap patient-modal__table-wrap--chemo">
                  <table className="patient-modal__table">
                    <thead>
                      <tr>
                        <th>Protocolo</th>
                        <th>Início</th>
                        <th>Fim</th>
                        <th>Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalCycles.map((c) => (
                        <tr key={c.id}>
                          <td>{c.protocol_name}</td>
                          <td>{formatPtDateLong(c.start_date)}</td>
                          <td>{c.end_date ? formatPtDateLong(c.end_date) : "—"}</td>
                          <td>{CYCLE_STATUS_PT[c.status] ?? c.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="patient-modal__section">
              <h3 className="patient-modal__section-title">Últimos medicamentos</h3>
              <p className="patient-modal__micro-label">Registro de uso contínuo</p>
              <p className="patient-modal__empty-hint">
                Nenhum dado de medicação neste prontuário. Quando o paciente sincronizar o diário de medicamentos do Aura Onco, os
                últimos remédios tomados aparecerão aqui.
              </p>
            </section>

            <section className="patient-modal__section">
              <h3 className="patient-modal__section-title">Histórico de nutrição</h3>
              <p className="patient-modal__micro-label">Acompanhamento dietético</p>
              <p className="patient-modal__empty-hint">
                Nenhum registro nutricional integrado. Orientações, metas calóricas e notas da equipe poderão ser exibidas neste
                bloco após integração clínica.
              </p>
            </section>
              </div>
            ) : null}

            {modalTab === "exames" ? (
              <div className="patient-modal__tab-panel">
                <section className="patient-modal__section" style={{ borderTop: "none", paddingTop: 0 }}>
                  <h3 className="patient-modal__section-title">Exames</h3>
                  <p className="patient-modal__micro-label">
                    Lista por documento. Clique na linha para expandir os biomarcadores; use Ver ou Baixar para o ficheiro quando existir.
                  </p>
                  {docOpenError ? (
                    <p className="error" role="alert" style={{ marginBottom: "0.5rem" }}>
                      {docOpenError}
                    </p>
                  ) : null}
                  {modalLoading ? (
                    <p className="muted patient-modal__loading">Carregando…</p>
                  ) : modalMedicalDocs.length === 0 && examBiomarkerGroups.orphans.length === 0 ? (
                    <p className="patient-modal__empty-hint">Nenhum exame ou marcador registado.</p>
                  ) : (
                    <>
                      {modalMedicalDocs.map((d) => {
                        const inlineOnly = d.storage_path.startsWith("inline-ocr/");
                        const markers = examBiomarkerGroups.byDoc.get(d.id) ?? [];
                        const expanded = expandedExamDocId === d.id;
                        return (
                          <div key={d.id} className="patient-modal__exam-card">
                            <div className="patient-modal__exam-row">
                              <button
                                type="button"
                                className="patient-modal__exam-toggle"
                                onClick={() => setExpandedExamDocId((cur) => (cur === d.id ? null : d.id))}
                                aria-expanded={expanded}
                              >
                                <span className="patient-modal__exam-chevron" aria-hidden>
                                  {expanded ? "▼" : "▶"}
                                </span>
                                <span>
                                  <strong>{DOCUMENT_TYPE_PT[d.document_type] ?? d.document_type}</strong>
                                  <span className="muted">
                                    {" "}
                                    · {formatPtDateTime(d.uploaded_at)} · {markers.length} marcador(es)
                                  </span>
                                </span>
                              </button>
                              <div className="patient-modal__exam-file-actions">
                                {!backendUrl ? (
                                  <span className="muted" style={{ fontSize: "0.8rem" }}>
                                    URL do backend (Integração)
                                  </span>
                                ) : inlineOnly ? (
                                  <span className="muted" style={{ fontSize: "0.8rem" }} title="OCR sem ficheiro no armazenamento">
                                    Só metadados
                                  </span>
                                ) : (
                                  <>
                                    <button type="button" className="btn-linkish" onClick={() => void openStaffExamView(d.id, "open")}>
                                      Ver
                                    </button>
                                    <button type="button" className="btn-linkish" onClick={() => void openStaffExamView(d.id, "download")}>
                                      Baixar
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            {expanded ? (
                              <div className="patient-modal__exam-detail">
                                {markers.length === 0 ? (
                                  <p className="muted" style={{ margin: 0 }}>
                                    Sem biomarcadores associados a este exame (ou ainda não extraídos).
                                  </p>
                                ) : (
                                  <div className="patient-modal__table-wrap">
                                    <table className="patient-modal__table patient-modal__table--compact">
                                      <thead>
                                        <tr>
                                          <th>Data</th>
                                          <th>Marcador</th>
                                          <th>Valor</th>
                                          <th>Un.</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {markers.map((b) => (
                                          <tr key={b.id}>
                                            <td>{formatPtDateTime(b.logged_at)}</td>
                                            <td>
                                              {b.name}
                                              {b.is_abnormal ? (
                                                <span
                                                  className="alert-badge alert-badge--inline"
                                                  title={b.reference_alert ?? "Fora da referência"}
                                                >
                                                  Atenção
                                                </span>
                                              ) : null}
                                            </td>
                                            <td>{formatBiomarkerValue(b)}</td>
                                            <td>{b.unit ?? "—"}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                      {examBiomarkerGroups.orphans.length > 0 ? (
                        <div className="patient-modal__section" style={{ marginTop: "1rem", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                          <h4 className="patient-modal__section-title" style={{ marginBottom: "0.35rem" }}>
                            Marcadores sem exame associado
                          </h4>
                          <p className="patient-modal__micro-label">Entradas antigas ou manuais sem documento de origem</p>
                          <div className="patient-modal__table-wrap">
                            <table className="patient-modal__table patient-modal__table--compact">
                              <thead>
                                <tr>
                                  <th>Data</th>
                                  <th>Marcador</th>
                                  <th>Valor</th>
                                  <th>Un.</th>
                                </tr>
                              </thead>
                              <tbody>
                                {examBiomarkerGroups.orphans.map((b) => (
                                  <tr key={b.id}>
                                    <td>{formatPtDateTime(b.logged_at)}</td>
                                    <td>
                                      {b.name}
                                      {b.is_abnormal ? (
                                        <span className="alert-badge alert-badge--inline" title={b.reference_alert ?? "Fora da referência"}>
                                          Atenção
                                        </span>
                                      ) : null}
                                    </td>
                                    <td>{formatBiomarkerValue(b)}</td>
                                    <td>{b.unit ?? "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                </section>

                <section className="patient-modal__section">
                  <h3 className="patient-modal__section-title">Anexar exame (equipe)</h3>
                  <p className="patient-modal__micro-label">Foto ou PDF — OCR atualiza biomarcadores e documentos</p>
                  {!backendUrl ? (
                    <p className="patient-modal__empty-hint">
                      Indique o URL do onco-backend no menu <strong>Integração</strong> ou em <code className="patient-modal__code">VITE_BACKEND_URL</code> no .env.
                    </p>
                  ) : (
                    <>
                      {staffUploadMsg ? (
                        <p className={staffUploadMsg.includes("registado") ? "info" : "error"} style={{ marginBottom: "0.5rem" }}>
                          {staffUploadMsg}
                        </p>
                      ) : null}
                      <label className="patient-modal__wa-label">
                        Ficheiro (JPG, PNG, WebP ou PDF)
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          disabled={staffUploadBusy}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void staffUploadExam(f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {staffUploadBusy ? <p className="muted patient-modal__loading">A processar…</p> : null}
                    </>
                  )}
                </section>
              </div>
            ) : null}

            {modalTab === "mensagens" ? (
              <div className="patient-modal__tab-panel">
                <section className="patient-modal__section" style={{ borderTop: "none", paddingTop: 0 }}>
                  <h3 className="patient-modal__section-title">WhatsApp (institucional)</h3>
                  <p className="patient-modal__micro-label">
                    Envio via backend (Cloud API). Requer opt-in LGPD e telefone E.164 no perfil do paciente.
                  </p>
                  {!backendUrl ? (
                    <p className="patient-modal__empty-hint">
                      Indique o URL do onco-backend no menu <strong>Integração</strong> ou em <code className="patient-modal__code">VITE_BACKEND_URL</code> no .env.
                    </p>
                  ) : modalWaProfile && !modalWaProfile.optIn ? (
                    <p className="patient-modal__empty-hint">
                      Paciente sem consentimento ativo para WhatsApp. O envio está bloqueado até opt-in no app ou cadastro autorizado.
                    </p>
                  ) : modalWaProfile && !modalWaProfile.phone_e164 ? (
                    <p className="patient-modal__empty-hint">Sem telefone E.164 no perfil — cadastre o número para enviar mensagens.</p>
                  ) : (
                    <>
                      <label className="patient-modal__wa-label">
                        Mensagem
                        <textarea
                          className="patient-modal__wa-text"
                          rows={3}
                          value={waCompose}
                          onChange={(e) => setWaCompose(e.target.value)}
                          placeholder="Texto da mensagem (sandbox/template conforme Meta)…"
                          maxLength={4096}
                        />
                      </label>
                      <div className="patient-modal__wa-actions">
                        <button type="button" className="btn-solid" disabled={waSendBusy} onClick={() => void sendWhatsApp()}>
                          {waSendBusy ? "Enviando…" : "Enviar via WhatsApp"}
                        </button>
                      </div>
                      {waSendError ? (
                        <p className="error" role="alert" style={{ marginTop: "0.5rem" }}>
                          {waSendError}
                        </p>
                      ) : null}
                      {waSendOk ? (
                        <p className="info" style={{ marginTop: "0.5rem", marginBottom: 0 }}>
                          {waSendOk}
                        </p>
                      ) : null}
                    </>
                  )}
                  <div className="patient-modal__table-wrap" style={{ marginTop: "1rem" }}>
                    <p className="patient-modal__micro-label">Últimos envios</p>
                    {modalOutbound.length === 0 ? (
                      <p className="muted" style={{ margin: "0.25rem 0 0" }}>
                        Nenhum registro.
                      </p>
                    ) : (
                      <table className="patient-modal__table patient-modal__table--compact">
                        <thead>
                          <tr>
                            <th>Quando</th>
                            <th>Estado</th>
                            <th>Prévia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modalOutbound.map((m) => (
                            <tr key={m.id}>
                              <td>{formatPtDateTime(m.created_at)}</td>
                              <td>
                                <span className={`pill pill--compact ${m.status === "failed" ? "risk-critical" : "risk-low"}`}>
                                  {OUTBOUND_STATUS_PT[m.status] ?? m.status}
                                </span>
                              </td>
                              <td className="patient-modal__wa-preview">
                                {m.error_detail ? (
                                  <span className="muted" title={m.error_detail}>
                                    {m.error_detail.length > 100 ? `${m.error_detail.slice(0, 100)}…` : m.error_detail}
                                  </span>
                                ) : (
                                  (m.body ?? "—").length > 120 ? `${(m.body ?? "").slice(0, 120)}…` : (m.body ?? "—")
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </section>
              </div>
            ) : null}

            {modalTab === "diario" ? (
              <div className="patient-modal__tab-panel">
                <section className="patient-modal__section" style={{ borderTop: "none", paddingTop: 0 }}>
                  <h3 className="patient-modal__section-title">Histórico de sintomas</h3>
                  {modalLoading ? (
                    <p className="muted patient-modal__loading">Carregando…</p>
                  ) : modalSymptoms.length === 0 ? (
                    <p className="muted">Sem registros.</p>
                  ) : (
                    <div className="patient-modal__table-wrap">
                      <table className="patient-modal__table">
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Categoria</th>
                            <th>Gravidade</th>
                            <th>Temp.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {modalSymptoms.map((s) => (
                            <tr key={s.id}>
                              <td>{formatPtDateTime(s.logged_at)}</td>
                              <td>{s.symptom_category}</td>
                              <td>
                                <span className={`pill pill--compact ${pillClassForSeverity(s.severity)}`}>
                                  {SEVERITY_PT[s.severity] ?? s.severity}
                                </span>
                              </td>
                              <td>{s.body_temperature != null ? `${s.body_temperature} °C` : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            ) : null}

            <p className="patient-modal__audit-hint muted">Acesso ao prontuário registrado para conformidade (auditoria).</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
