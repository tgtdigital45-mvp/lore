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

export function profileName(p: PatientRow["profiles"]): string {
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

export function profileAvatarUrl(p: PatientRow["profiles"]): string | null {
  if (!p) return null;
  const row = Array.isArray(p) ? p[0] : p;
  const u = row?.avatar_url;
  return typeof u === "string" && u.trim() !== "" ? u : null;
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
