import { supabase } from "./lib/supabase";
import { sanitizeSupabaseError } from "./lib/errorMessages";
import { refreshSupabaseSessionIfStale } from "./lib/authSession";
import { PENDING_STAFF_ROLE_KEY } from "./constants";

type StaffRole = "doctor" | "nurse" | "hospital_admin";

/**
 * Onboarding demo: vínculo atômico via RPC (SECURITY DEFINER), sem updates diretos de `role` no cliente.
 * Remove a superfície de escalada de privilégio que existia com `profiles.update({ role })` incondicional.
 */
export async function applyPendingStaffLink(): Promise<{ error: string | null }> {
  const raw = localStorage.getItem(PENDING_STAFF_ROLE_KEY);
  if (raw !== "doctor" && raw !== "nurse" && raw !== "hospital_admin") {
    return { error: null };
  }
  const { error } = await supabase.rpc("claim_demo_staff_assignment");
  if (error) return { error: sanitizeSupabaseError(error) };
  localStorage.removeItem(PENDING_STAFF_ROLE_KEY);
  return { error: null };
}

export function setPendingStaffRole(role: StaffRole) {
  localStorage.setItem(PENDING_STAFF_ROLE_KEY, role);
}

/** Garante vínculo demo quando há papel pendente; sessão atual + JWT renovado se necessário. */
export async function ensureStaffIfPending() {
  const { data: auth } = await supabase.auth.getSession();
  const session = await refreshSupabaseSessionIfStale(auth.session);
  if (!session?.user) return;
  if (!localStorage.getItem(PENDING_STAFF_ROLE_KEY)) return;
  const { error } = await applyPendingStaffLink();
  if (error && import.meta.env.DEV) {
    console.warn("ensureStaffIfPending:", error);
  }
}
