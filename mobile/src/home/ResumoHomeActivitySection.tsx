import { Pressable, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Href } from "expo-router";
import { Link } from "expo-router";
import type { AppTheme } from "@/src/theme/theme";
import { formatDayMonth } from "@/src/home/homeScreenHelpers";
import { documentTypeLabel, labelSymptomCategory } from "@/src/i18n/ui";
import type { SymptomSnippet } from "@/src/home/homeSummaryTypes";

type LastDoc = { document_type: string; uploaded_at: string } | null;

type Props = {
  theme: AppTheme;
  latestSymptom: SymptomSnippet | null | undefined;
  lastDoc: LastDoc;
};

export function ResumoHomeActivitySection({ theme, latestSymptom, lastDoc }: Props) {
  return (
    <View style={{ marginTop: theme.spacing.lg }}>
      <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>Atividades recentes</Text>
      <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
        <Link href={"/(tabs)/health/diary" as Href} asChild>
          <Pressable
            style={{
              flex: 1,
              backgroundColor: theme.colors.background.primary,
              borderRadius: theme.radius.md,
              padding: theme.spacing.md,
              minHeight: 110,
            }}
          >
            <FontAwesome name="heart" size={20} color={theme.colors.semantic.symptoms} />
            <Text style={[theme.typography.headline, { color: theme.colors.text.primary, marginTop: theme.spacing.sm }]}>Sintomas</Text>
            <Text style={{ color: theme.colors.semantic.symptoms, marginTop: 4 }} numberOfLines={2}>
              {latestSymptom
                ? latestSymptom.entry_kind === "prd"
                  ? `D/N/F ${latestSymptom.pain_level}/${latestSymptom.nausea_level}/${latestSymptom.fatigue_level}`
                  : labelSymptomCategory(latestSymptom.symptom_category ?? "")
                : "Nenhum registro"}
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginTop: 6 }}>
              {latestSymptom ? formatDayMonth(latestSymptom.logged_at) : "—"}
            </Text>
          </Pressable>
        </Link>
        <Link href="/(tabs)/exams" asChild>
          <Pressable
            style={{
              flex: 1,
              backgroundColor: theme.colors.background.primary,
              borderRadius: theme.radius.md,
              padding: theme.spacing.md,
              minHeight: 110,
            }}
          >
            <FontAwesome name="file-text-o" size={20} color={theme.colors.semantic.respiratory} />
            <Text style={[theme.typography.headline, { color: theme.colors.text.primary, marginTop: theme.spacing.sm }]}>Exames</Text>
            <Text style={{ color: theme.colors.text.primary, marginTop: 4 }} numberOfLines={2}>
              {lastDoc ? documentTypeLabel[lastDoc.document_type] ?? lastDoc.document_type : "Nenhum arquivo"}
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginTop: 6 }}>
              {lastDoc ? formatDayMonth(lastDoc.uploaded_at) : "—"}
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
