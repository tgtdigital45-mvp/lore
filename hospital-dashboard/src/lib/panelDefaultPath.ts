const STORAGE_KEY = "oncocare:last-patient-id";

function isUuidLike(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export function rememberPatientVisit(patientId: string): void {
  if (!isUuidLike(patientId)) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, patientId);
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Destino do item "Painel": último dossiê visitado (se ainda estiver na fila), senão primeiro da triagem, senão índice `/paciente` sem dossiê demo.
 */
export function getPanelDefaultPath(rows?: readonly { id: string }[] | null): string {
  const allowed = new Set((rows ?? []).map((r) => r.id));
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored && isUuidLike(stored) && allowed.has(stored)) {
      return `/paciente/${stored}`;
    }
  } catch {
    /* ignore */
  }
  const first = rows?.[0]?.id;
  if (first && isUuidLike(first)) return `/paciente/${first}`;
  return "/paciente";
}
