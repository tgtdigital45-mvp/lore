/** Campos mínimos do wizard para exibir linha de dosagem (forma + quantidade). */
export type DosageLineDraft = {
  form: string | null;
  dosageAmount: string | null;
  unit: string | null;
};

export function formatDosageLine(draft: DosageLineDraft): string {
  const parts: string[] = [];
  if (draft.form) parts.push(draft.form);
  if (draft.dosageAmount?.trim()) {
    parts.push(`${draft.dosageAmount.trim()}${draft.unit ? ` ${draft.unit}` : ""}`);
  }
  return parts.join(", ");
}
