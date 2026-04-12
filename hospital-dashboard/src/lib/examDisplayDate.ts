/** Data do exame para gráficos: preferir a extraída do documento, senão data de registo. */
export function examDisplayDateIso(doc: { exam_performed_at?: string | null; uploaded_at: string }): string {
  const e = doc.exam_performed_at;
  if (e != null && String(e).trim() !== "") return e;
  return doc.uploaded_at;
}
