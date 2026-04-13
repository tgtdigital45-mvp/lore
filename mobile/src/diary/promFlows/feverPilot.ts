import type { PromFlowResult } from "@/src/diary/promFlows/types";

/** Piloto febre: temperatura + sintomas associados → grau AE + sinal para vigilância diária. */
export function computeFeverAdaptiveResult(answers: {
  tempC: number;
  rigors?: boolean;
  mentalStatusOk?: boolean;
}): PromFlowResult & { startFeverWatch: boolean } {
  const t = answers.tempC;
  const rec: PromFlowResult["answers"] = [{ stepId: "temp_c", value: t }];
  let grade = 1;
  if (t >= 39.0) grade = 3;
  else if (t >= 38.0) grade = 2;
  else if (t >= 37.3) grade = 1;
  else grade = 0;

  if (answers.rigors) {
    rec.push({ stepId: "rigors", value: true });
    grade = Math.max(grade, 2);
  }
  if (answers.mentalStatusOk === false) {
    rec.push({ stepId: "mental_status", value: false });
    grade = Math.max(grade, 3);
  }

  const aeMaxGrade = Math.min(5, grade);
  const startFeverWatch = t >= 37.8 || aeMaxGrade >= 2;

  return {
    flowId: "fever_adaptive_v1",
    aeMaxGrade,
    termGrades: [{ slug: "fever", grade: aeMaxGrade }],
    answers: rec,
    startFeverWatch,
  };
}
