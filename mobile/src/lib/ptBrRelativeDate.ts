/** Diferença em dias civis (fuso local) entre a data de `iso` e `ref` (por defeito hoje). */
export function localCalendarDaysFrom(iso: string, ref: Date = new Date()): number {
  const t = new Date(iso);
  const strip = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((strip(t) - strip(ref)) / 86400000);
}

/**
 * Frase curta para agendamentos / doses: "Hoje às …", "Amanhã às …", dia da semana, ou data completa.
 */
export function relativeSchedulePhrasePtBr(iso: string): string {
  const d = localCalendarDaysFrom(iso);
  const time = new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (d === 0) return `Hoje às ${time}`;
  if (d === 1) return `Amanhã às ${time}`;
  if (d > 1 && d <= 7) {
    const weekday = new Date(iso).toLocaleDateString("pt-BR", { weekday: "long" });
    const cap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    return `${cap} às ${time}`;
  }
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" });
}
