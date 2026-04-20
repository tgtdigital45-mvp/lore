import type { RiskRow } from "@/types/dashboard";

type ProfileSlice = {
  phone_e164?: string | null;
  whatsapp_opt_in_at?: string | null;
  whatsapp_opt_in_revoked_at?: string | null;
};

function profileSlice(row: RiskRow): ProfileSlice | null {
  const prof = row.profiles;
  if (!prof) return null;
  return (Array.isArray(prof) ? prof[0] : prof) as ProfileSlice | null;
}

/** Telefone + opt-in LGPD para envio institucional (Meta ou Evolution via backend). */
export function patientWhatsappContact(row: RiskRow): {
  canMessage: boolean;
  phone_e164: string | null;
  optIn: boolean;
} {
  const p = profileSlice(row);
  const phone_e164 = p?.phone_e164?.trim() || null;
  const optIn = Boolean(p?.whatsapp_opt_in_at && !p?.whatsapp_opt_in_revoked_at);
  return { canMessage: Boolean(optIn && phone_e164), phone_e164, optIn };
}
