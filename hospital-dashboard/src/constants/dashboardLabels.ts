import type { ModalTabId } from "../types/dashboard";

export const CANCER_PT: Record<string, string> = {
  breast: "Mama",
  lung: "Pulmão",
  prostate: "Próstata",
  leukemia: "Leucemia",
  colorectal: "Colorretal",
  other: "Outro",
};

export const CANCER_EMOJI: Record<string, string> = {
  breast: "🎀",
  lung: "🫁",
  prostate: "🔬",
  leukemia: "🩸",
  colorectal: "🩺",
  other: "📋",
};

/** Ordem de risco (0 = mínimo) — alinhado à app móvel (escala verbal + legado). */
export const SEVERITY_RANK: Record<string, number> = {
  absent: 0,
  present: 1,
  mild: 1,
  moderate: 2,
  severe: 3,
  life_threatening: 4,
};

export const SEVERITY_PT: Record<string, string> = {
  absent: "Não presente",
  present: "Presente",
  mild: "Suave",
  moderate: "Moderado",
  severe: "Grave",
  life_threatening: "Ameaça à vida",
};

export const CYCLE_STATUS_PT: Record<string, string> = {
  active: "Em curso",
  completed: "Concluído",
  suspended: "Suspenso",
};

export const TREATMENT_KIND_PT: Record<string, string> = {
  chemotherapy: "Quimioterapia",
  radiotherapy: "Radioterapia",
  hormone: "Hormonioterapia",
  immunotherapy: "Imunoterapia",
  other: "Outro",
};

export const DOCUMENT_TYPE_PT: Record<string, string> = {
  blood_test: "Laboratorial",
  biopsy: "Biópsia / anatomia",
  scan: "Imagem",
  administrative: "Guia / convênio / adm.",
};

/**
 * Categorias `symptom_logs.symptom_category` (app Aura) — ids estáveis em snake_case.
 * Manter sincronizado com `mobile/src/diary/symptomCatalog.ts` (SYMPTOM_NAV_ITEMS).
 */
export const SYMPTOM_CATEGORY_PT: Record<string, string> = {
  sleep_changes: "Alterações de Sono",
  chest_tightness: "Aperto ou Dor no Peito",
  heartburn: "Azia",
  rapid_heartbeat: "Batimentos Rápidos ou Palpitantes",
  chills: "Calafrios",
  congestion: "Congestão",
  fainting: "Desmaio",
  diarrhea: "Diarreia",
  pain: "Dor",
  body_muscle_pain: "Dor Corporal e Muscular",
  headache: "Dor de Cabeça",
  sore_throat: "Dor de Garganta",
  low_back_pain: "Dor na Região Lombar",
  breast_pain: "Dor no Seio",
  pelvic_pain: "Dor Pélvica",
  fatigue: "Fadiga",
  fever: "Febre",
  hydration: "Hidratação",
  runny_nose: "Nariz Escorrendo",
  nausea: "Náusea",
  hot_flashes: "Ondas de Calor",
  palpitations: "Palpitações",
  dry_skin: "Pele Seca",
  hair_loss: "Perda de Cabelo",
  memory_loss: "Perda de Memória",
  loss_of_smell: "Perda do Olfato",
  loss_of_taste: "Perda do Paladar",
  constipation: "Prisão de Ventre",
  vaginal_dryness: "Secura Vaginal",
  night_sweats: "Suor Noturno",
  cough: "Tosse",
  vomiting: "Vômito",
};

/** Valores legados ou importados em inglês (categoria livre no registo). */
export const SYMPTOM_CATEGORY_EN_FALLBACK: Record<string, string> = {
  hurt: "Dor",
  burn: "Queimação",
  burning: "Queimação",
  ache: "Dor",
  aches: "Dores",
  fatigue: "Fadiga",
  nausea: "Náusea",
  fever: "Febre",
  chills: "Calafrios",
  cough: "Tosse",
  pain: "Dor",
};

export const NUTRITION_LOG_TYPE_PT: Record<string, string> = {
  water: "Água",
  coffee: "Café",
  meal: "Refeição",
  calories: "Calorias",
  appetite: "Apetite",
};

export const VITAL_TYPE_PT: Record<string, string> = {
  temperature: "Temperatura",
  heart_rate: "Frequência cardíaca",
  blood_pressure: "Pressão arterial",
  spo2: "SpO₂",
  weight: "Peso",
  glucose: "Glicemia",
};

export const AUDIT_ACTION_PT: Record<string, string> = {
  VIEW_SYMPTOMS: "Ver sintomas",
  VIEW_PROFILE: "Ver perfil",
  VIEW_PATIENT: "Abrir prontuário",
  EMERGENCY_TRIGGER: "Emergência",
  AGENT_SYMPTOM_LOG: "Registro (agente)",
  WHATSAPP_OUTBOUND: "WhatsApp (envio)",
};

export const OUTBOUND_STATUS_PT: Record<string, string> = {
  pending: "Pendente",
  sent: "Enviada",
  delivered: "Entregue",
  read: "Lida",
  failed: "Falhou",
};

export const MODAL_TAB_LABEL: Record<ModalTabId, string> = {
  resumo: "Resumo",
  exames: "Exames",
  mensagens: "Mensagens",
  diario: "Diário",
};

export const CARE_TIPS = [
  {
    emoji: "💧",
    title: "Hidratação no tratamento",
    text: "Água suficiente ajuda no metabolismo de fármacos e reduz fadiga.",
  },
  {
    emoji: "🌡️",
    title: "Febre ou infecção",
    text: "Com nadir ou quimio, avise a equipe ante febre ≥ 37,8 °C.",
  },
  {
    emoji: "📝",
    title: "Diário de sintomas",
    text: "Pacientes no app Aura registram sintomas; a triagem prioriza gravidade recente.",
  },
] as const;
