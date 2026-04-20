import type { EmergencyContactEmbed, PatientRow, WaProfileSnap } from "../types/dashboard";

export function waProfileFromPatientsJoin(profiles: unknown): WaProfileSnap {
  const row = Array.isArray(profiles) ? profiles[0] : profiles;
  if (!row || typeof row !== "object") return { phone_e164: null, optIn: false };
  const o = row as Record<string, unknown>;
  const phone = typeof o.phone_e164 === "string" ? o.phone_e164 : null;
  const hasIn = o.whatsapp_opt_in_at != null;
  const hasRev = o.whatsapp_opt_in_revoked_at != null;
  return { phone_e164: phone, optIn: hasIn && !hasRev };
}

/** Aceita perfis com `full_name` opcional (ex.: joins em `clinical_tasks`). */
export function profileName(
  p:
    | PatientRow["profiles"]
    | { full_name?: string | null; date_of_birth?: string | null; avatar_url?: string | null }
    | { full_name?: string | null; date_of_birth?: string | null; avatar_url?: string | null }[]
    | null
): string {
  if (!p) return "—";
  if (Array.isArray(p)) return p[0]?.full_name ?? "—";
  return p.full_name ?? "—";
}

export function firstName(full: string): string {
  const t = full.trim();
  if (!t) return "Profissional";
  return t.split(/\s+/)[0] ?? t;
}

export function roleLabel(role: string | undefined): string {
  if (role === "doctor") return "Médico(a)";
  if (role === "nurse") return "Enfermeiro(a)";
  if (role === "hospital_admin") return "Gestão hospitalar";
  return "Equipe clínica";
}

export function profileDob(p: PatientRow["profiles"]): string | null {
  if (!p) return null;
  const row = Array.isArray(p) ? p[0] : p;
  return row?.date_of_birth ?? null;
}

export function profilePhoneE164(p: PatientRow["profiles"]): string | null {
  if (!p) return null;
  const row = Array.isArray(p) ? p[0] : p;
  const t = row && "phone_e164" in row ? (row as { phone_e164?: string | null }).phone_e164 : null;
  return typeof t === "string" && t.trim() ? t.trim() : null;
}

export function profileEmailDisplay(p: PatientRow["profiles"]): string | null {
  if (!p) return null;
  const row = Array.isArray(p) ? p[0] : p;
  const t = row && "email_display" in row ? (row as { email_display?: string | null }).email_display : null;
  return typeof t === "string" && t.trim() ? t.trim() : null;
}

export function profileAvatarUrl(p: PatientRow["profiles"]): string | null {
  if (!p) return null;
  const row = Array.isArray(p) ? p[0] : p;
  const u = row?.avatar_url;
  if (typeof u !== "string") return null;
  let t = u.trim();
  if (t === "") return null;
  if (t.startsWith("//")) t = `https:${t}`;
  if (!/^https?:\/\//i.test(t)) return null;
  return t;
}

export function normalizeEmergencyContacts(raw: PatientRow["patient_emergency_contacts"]): EmergencyContactEmbed[] {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return [...arr].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

export function ageFromDob(iso: string | null): string | null {
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

export function initialsFromName(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}
