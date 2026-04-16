/**
 * Lista única de sintomas (rótulos em pt-BR, ids estáveis em snake_case para `symptom_logs.symptom_category`).
 * Ordem alfabética por rótulo.
 */
export const SYMPTOM_NAV_ITEMS = [
  { id: "sleep_changes", label: "Alterações de Sono" },
  { id: "chest_tightness", label: "Aperto ou Dor no Peito" },
  { id: "heartburn", label: "Azia" },
  { id: "rapid_heartbeat", label: "Batimentos Rápidos ou Palpitantes" },
  { id: "chills", label: "Calafrios" },
  { id: "congestion", label: "Congestão" },
  { id: "fainting", label: "Desmaio" },
  { id: "diarrhea", label: "Diarreia" },
  { id: "pain", label: "Dor" },
  { id: "body_muscle_pain", label: "Dor Corporal e Muscular" },
  { id: "headache", label: "Dor de Cabeça" },
  { id: "sore_throat", label: "Dor de Garganta" },
  { id: "low_back_pain", label: "Dor na Região Lombar" },
  { id: "breast_pain", label: "Dor no Seio" },
  { id: "pelvic_pain", label: "Dor Pélvica" },
  { id: "fatigue", label: "Fadiga" },
  { id: "fever", label: "Febre" },
  { id: "hydration", label: "Hidratação" },
  { id: "runny_nose", label: "Nariz Escorrendo" },
  { id: "nausea", label: "Náusea" },
  { id: "hot_flashes", label: "Ondas de Calor" },
  { id: "palpitations", label: "Palpitações" },
  { id: "dry_skin", label: "Pele Seca" },
  { id: "hair_loss", label: "Perda de Cabelo" },
  { id: "memory_loss", label: "Perda de Memória" },
  { id: "loss_of_smell", label: "Perda do Olfato" },
  { id: "loss_of_taste", label: "Perda do Paladar" },
  { id: "constipation", label: "Prisão de Ventre" },
  { id: "vaginal_dryness", label: "Secura Vaginal" },
  { id: "night_sweats", label: "Suor Noturno" },
  { id: "cough", label: "Tosse" },
  { id: "vomiting", label: "Vômito" },
] as const;

export type SymptomDetailKey = (typeof SYMPTOM_NAV_ITEMS)[number]["id"];

export function symptomLabel(id: SymptomDetailKey): string {
  const row = SYMPTOM_NAV_ITEMS.find((x) => x.id === id);
  return row?.label ?? id;
}

/** Para onde navegar para registrar (temperatura ou legado verbal / CTCAE). */
export type SymptomLogDestination = { type: "fever_temp" } | { type: "legacy_intensity"; key: SymptomDetailKey };

/** Sintomas em que a UI oferece anexo de foto opcional no passo de registo. */
export const SYMPTOM_KEYS_OPTIONAL_PHOTO = new Set<SymptomDetailKey>(["dry_skin", "breast_pain"]);

export function logDestinationForSymptom(id: SymptomDetailKey): SymptomLogDestination {
  if (id === "fever") return { type: "fever_temp" };
  return { type: "legacy_intensity", key: id };
}
