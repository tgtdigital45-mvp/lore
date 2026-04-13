import type { PromFlowResult } from "@/src/diary/promFlows/types";

/** Piloto náusea: ramifica presença → vómitos → impacto na ingestão (proxy PRO-CTCAE). */
export function computeNauseaAdaptiveResult(answers: {
  nauseaPresent: boolean;
  vomitingEpisodes?: "none" | "1_2" | "3_plus";
  intakeImpact?: "normal" | "reduced" | "none";
}): PromFlowResult {
  const rec: PromFlowResult["answers"] = [
    { stepId: "nausea_present", value: answers.nauseaPresent },
  ];

  if (!answers.nauseaPresent) {
    return {
      flowId: "nausea_adaptive_v1",
      aeMaxGrade: 0,
      termGrades: [
        { slug: "nausea", grade: 0 },
        { slug: "vomiting", grade: 0 },
      ],
      answers: rec,
    };
  }

  const vom = answers.vomitingEpisodes ?? "none";
  rec.push({ stepId: "vomiting", value: vom });
  const intake = answers.intakeImpact ?? "reduced";
  rec.push({ stepId: "intake", value: intake });

  let vomGrade = 0;
  if (vom === "1_2") vomGrade = 2;
  if (vom === "3_plus") vomGrade = 3;

  let nauseaGrade = 1;
  if (intake === "reduced") nauseaGrade = 2;
  if (intake === "none") nauseaGrade = 3;
  if (vomGrade >= 3) nauseaGrade = Math.max(nauseaGrade, 3);

  const aeMaxGrade = Math.min(5, Math.max(nauseaGrade, vomGrade));

  return {
    flowId: "nausea_adaptive_v1",
    aeMaxGrade,
    termGrades: [
      { slug: "nausea", grade: nauseaGrade },
      { slug: "vomiting", grade: vomGrade },
    ],
    answers: rec,
  };
}
