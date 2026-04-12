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

export const SEVERITY_RANK: Record<string, number> = {
  mild: 1,
  moderate: 2,
  severe: 3,
  life_threatening: 4,
};

export const SEVERITY_PT: Record<string, string> = {
  mild: "Leve",
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

/** Categorias do diário de sintomas (legado) — alinhado à app móvel. */
export const SYMPTOM_CATEGORY_PT: Record<string, string> = {
  nausea: "Náuseas",
  fever: "Febre",
  fatigue: "Fadiga",
  diarrhea: "Diarreia",
  pain: "Dor",
  hydration: "Hidratação",
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
    text: "Com nadir ou quimio, avise a equipe ante febre ≥ 38 °C.",
  },
  {
    emoji: "📝",
    title: "Diário de sintomas",
    text: "Pacientes no app Aura registram sintomas; a triagem prioriza gravidade recente.",
  },
] as const;
