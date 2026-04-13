import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { recordContentView, useRecommendedContent } from "@/src/education/useRecommendedContent";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { usePatient } from "@/src/hooks/usePatient";
import { supabase } from "@/src/lib/supabase";

export default function EducationScreen() {
  const { theme } = useAppTheme();
  const { patient } = usePatient();
  const [expanded, setExpanded] = useState<string | null>(null);

  const recentSymptoms = useQuery({
    queryKey: ["symptom_categories_recent", patient?.id],
    enabled: Boolean(patient?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("symptom_logs")
        .select("symptom_category")
        .eq("patient_id", patient!.id)
        .order("logged_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      const set = new Set<string>();
      for (const row of data ?? []) {
        const c = (row as { symptom_category?: string | null }).symptom_category;
        if (c) set.add(c);
      }
      return [...set];
    },
  });

  const categories = recentSymptoms.data ?? [];
  const { data: articles = [], isLoading } = useRecommendedContent({
    patientId: patient?.id,
    symptomCategories: categories,
    primaryCancerType: patient?.primary_cancer_type,
  });

  const subtitle = useMemo(() => {
    if (categories.length === 0) return "Conteúdos gerais de suporte durante o tratamento.";
    return "Priorizados com base nos sintomas que registou recentemente.";
  }, [categories.length]);

  if (!patient) {
    return (
      <ResponsiveScreen variant="tabGradient">
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>Complete o cadastro para ver artigos.</Text>
      </ResponsiveScreen>
    );
  }

  return (
    <ResponsiveScreen variant="tabGradient">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: theme.spacing.xl * 2 }}>
        <Text style={[theme.typography.largeTitle, { color: theme.colors.text.primary }]}>Apoio</Text>
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>{subtitle}</Text>

        {isLoading ? (
          <Text style={{ marginTop: theme.spacing.lg, color: theme.colors.text.secondary }}>A carregar…</Text>
        ) : (
          <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.md }}>
            {articles.map((a) => {
              const open = expanded === a.id;
              return (
                <View
                  key={a.id}
                  style={{
                    borderRadius: theme.radius.lg,
                    backgroundColor: theme.colors.background.primary,
                    borderWidth: 1,
                    borderColor: theme.colors.border.divider,
                    overflow: "hidden",
                  }}
                >
                  <Pressable
                    onPress={() => {
                      setExpanded(open ? null : a.id);
                      void recordContentView(patient.id, a.id);
                    }}
                    style={{ padding: theme.spacing.md }}
                  >
                    <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>{a.title}</Text>
                    <Text style={{ marginTop: 6, fontSize: 12, color: theme.colors.text.tertiary }}>
                      {(a.symptom_tags ?? []).slice(0, 4).join(" · ")}
                    </Text>
                  </Pressable>
                  {open ? (
                    <Text style={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.md, color: theme.colors.text.primary }}>
                      {a.body}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </ResponsiveScreen>
  );
}
