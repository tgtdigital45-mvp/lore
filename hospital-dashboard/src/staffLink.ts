import { supabase } from "./lib/supabase";
import { refreshSupabaseSessionIfStale } from "./lib/authSession";
import { DEMO_HOSPITAL_ID, PENDING_STAFF_ROLE_KEY } from "./constants";

type StaffRole = "doctor" | "nurse" | "hospital_admin";

/** Após cadastro/login: vínculo ao hospital demo; papel sempre gestor (dashboard MVP sem equipa clínica). */
export async function applyPendingStaffLink(userId: string): Promise<{ error: string | null }> {
  const raw = localStorage.getItem(PENDING_STAFF_ROLE_KEY);
  if (raw !== "doctor" && raw !== "nurse" && raw !== "hospital_admin") {
    return { error: null };
  }
  const role: StaffRole = "hospital_admin";

  const { error: pErr } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (pErr) return { error: pErr.message };

  const { error: sErr } = await supabase.from("staff_assignments").insert({
    staff_id: userId,
    hospital_id: DEMO_HOSPITAL_ID,
  });
  if (sErr) {
    if (sErr.code === "23505" || sErr.message.includes("duplicate")) {
      localStorage.removeItem(PENDING_STAFF_ROLE_KEY);
      return { error: null };
    }
    return { error: sErr.message };
  }

  localStorage.removeItem(PENDING_STAFF_ROLE_KEY);
  return { error: null };
}

export function setPendingStaffRole(role: StaffRole) {
  localStorage.setItem(PENDING_STAFF_ROLE_KEY, role);
}

/** Garante vínculo demo + papel; usa sempre sessão atual do cliente e renova JWT se estiver expirado. */
export async function ensureStaffIfPending() {
  const { data: auth } = await supabase.auth.getSession();
  const session = await refreshSupabaseSessionIfStale(auth.session);
  if (!session?.user) return;
  await applyPendingStaffLink(session.user.id);
  const { error } = await supabase.from("profiles").update({ role: "hospital_admin" }).eq("id", session.user.id);
  if (error) console.warn("ensureStaffIfPending: role hospital_admin:", error.message);
}
