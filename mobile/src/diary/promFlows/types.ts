/** ePROM adaptativo: resultado persistido em symptom_logs (entry_kind ae_flow). */

export type PromFlowId = "nausea_adaptive_v1" | "fever_adaptive_v1";

export type PromAnswerRecord = {
  stepId: string;
  value: string | boolean | number;
};

export type PromFlowResult = {
  flowId: PromFlowId;
  aeMaxGrade: number;
  /** Uma linha por termo CTCAE tocado pelo fluxo */
  termGrades: { slug: string; grade: number }[];
  answers: PromAnswerRecord[];
};
