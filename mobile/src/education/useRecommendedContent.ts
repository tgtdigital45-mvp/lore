import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/src/lib/supabase";

export type EducationalArticle = {
  id: string;
  slug: string;
  title: string;
  body: string;
  symptom_tags: string[];
  cancer_types: string[];
  sort_order: number;
};

export function useRecommendedContent(opts: {
  patientId: string | undefined;
  symptomCategories: string[];
  primaryCancerType: string | null | undefined;
}) {
  return useQuery({
    queryKey: ["educational_content", opts.patientId, opts.symptomCategories, opts.primaryCancerType],
    enabled: Boolean(opts.patientId),
    queryFn: async (): Promise<EducationalArticle[]> => {
      const { data, error } = await supabase
        .from("educational_content")
        .select("id, slug, title, body, symptom_tags, cancer_types, sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as EducationalArticle[];
      const cancer = opts.primaryCancerType ?? "";
      const sym = new Set(opts.symptomCategories.filter(Boolean));
      const scored = rows.map((r) => {
        let score = 0;
        for (const t of r.symptom_tags ?? []) {
          if (sym.has(t)) score += 3;
        }
        if (cancer && (r.cancer_types?.length ?? 0) > 0 && r.cancer_types!.includes(cancer)) score += 2;
        return { r, score };
      });
      scored.sort((a, b) => b.score - a.score || a.r.sort_order - b.r.sort_order);
      return scored.map((x) => x.r);
    },
  });
}

export async function recordContentView(patientId: string, contentId: string) {
  await supabase.from("patient_content_views").upsert(
    { patient_id: patientId, content_id: contentId, viewed_at: new Date().toISOString() },
    { onConflict: "patient_id,content_id" }
  );
}
