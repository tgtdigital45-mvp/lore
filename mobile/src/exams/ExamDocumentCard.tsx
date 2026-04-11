import { Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { AppTheme } from "@/src/theme/theme";
import type { MedicalDocRow } from "./examHelpers";
import { examDisplayDateIso, formatExamDate, getDoctorName, getDocumentTitle, kindBadge } from "./examHelpers";

const IA_BLUE = "#007AFF";

type Props = {
  theme: AppTheme;
  row: MedicalDocRow;
};

export function ExamDocumentCard({ theme, row }: Props) {
  const j = row.ai_extracted_json;
  const summary = typeof j?.summary_pt_br === "string" ? j.summary_pt_br : "";
  const title = getDocumentTitle(row);
  const doctor = getDoctorName(j);
  const dateStr = formatExamDate(examDisplayDateIso(row));
  const badge = kindBadge(row.document_type);

  return (
    <View
      style={{
        backgroundColor: theme.colors.background.primary,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border.divider,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.md }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: theme.radius.sm,
            backgroundColor: "#E8F4FF",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FontAwesome name="file-text-o" size={22} color={IA_BLUE} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]} numberOfLines={2}>
            {title}
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: theme.colors.text.secondary,
              marginTop: 4,
              letterSpacing: 0.3,
            }}
          >
            {badge}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", maxWidth: "38%" }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.text.primary }}>{dateStr}</Text>
          <Text style={{ fontSize: 12, color: theme.colors.text.secondary, marginTop: 2, textAlign: "right" }} numberOfLines={2}>
            {doctor}
          </Text>
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: theme.colors.border.divider, marginVertical: theme.spacing.md }} />

      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: theme.spacing.sm }}>
        <FontAwesome name="bolt" size={14} color={IA_BLUE} />
        <Text style={{ fontSize: 11, fontWeight: "800", color: IA_BLUE, letterSpacing: 0.8 }}>RESUMO IA</Text>
      </View>
      <Text style={[theme.typography.body, { color: theme.colors.text.primary, lineHeight: 22 }]} numberOfLines={2}>
        {summary || "Resumo ainda não disponível para este documento."}
      </Text>
    </View>
  );
}
