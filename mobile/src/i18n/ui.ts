/** Rótulos de interface em pt-BR (valores de API/DB podem ser chaves em inglês). */

export const symptomCategoryLabel: Record<string, string> = {
  nausea: "Náusea",
  fever: "Febre",
  fatigue: "Fadiga",
  diarrhea: "Diarreia",
  pain: "Dor",
  hydration: "Hidratação",
};

export const severityLabel: Record<string, string> = {
  mild: "Leve",
  moderate: "Moderada",
  severe: "Grave",
  life_threatening: "Risco à vida",
};

export const cancerTypeLabel: Record<string, string> = {
  breast: "Mama",
  lung: "Pulmão",
  prostate: "Próstata",
  leukemia: "Leucemia",
  colorectal: "Colorretal",
  other: "Outro",
};

export function labelSymptomCategory(key: string): string {
  return symptomCategoryLabel[key] ?? key;
}

export function labelSeverity(key: string): string {
  return severityLabel[key] ?? key;
}

export function labelCancerType(key: string): string {
  return cancerTypeLabel[key] ?? key;
}

export const documentTypeLabel: Record<string, string> = {
  blood_test: "Exame de sangue",
  biopsy: "Biópsia / anatomopatológico",
  scan: "Exame de imagem",
  administrative: "Guia / convênio / administrativo",
};
