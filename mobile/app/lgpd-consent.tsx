import { useState } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/src/auth/AuthContext";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { supabase } from "@/src/lib/supabase";

export default function LgpdConsentScreen() {
  const { session } = useAuth();
  const { theme } = useAppTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const [analytics, setAnalytics] = useState(false);
  const [research, setResearch] = useState(false);
  const [shareTeam, setShareTeam] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!session?.user) return;
    setBusy(true);
    const { error } = await supabase.from("patient_consents").upsert(
      {
        profile_id: session.user.id,
        consent_required_treatment: true,
        consent_analytics: analytics,
        consent_research: research,
        consent_share_care_team: shareTeam,
        consent_notifications: notifications,
        policy_version: "2026-04",
        accepted_at: new Date().toISOString(),
      },
      { onConflict: "profile_id" }
    );
    setBusy(false);
    if (error) {
      Alert.alert("Consentimento", error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["patient_consents", session.user.id] });
    router.replace("/");
  }

  return (
    <ResponsiveScreen>
      <ScrollView contentContainerStyle={{ paddingVertical: theme.spacing.lg, paddingBottom: theme.spacing.xl }}>
        <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>Privacidade e consentimento</Text>
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
          Conforme a LGPD, escolha o uso dos seus dados. O tratamento mínimo necessário para o funcionamento do Onco está
          sempre ativo.
        </Text>

        <View
          style={{
            marginTop: theme.spacing.lg,
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.background.secondary,
          }}
        >
          <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>Dados clínicos e de conta</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>
            Obrigatório: registro de sintomas, medicamentos e perfil associados à sua conta, com encriptação em trânsito e
            acesso restrito por RLS no Supabase.
          </Text>
        </View>

        <View style={{ marginTop: theme.spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={[theme.typography.body, { flex: 1, paddingRight: theme.spacing.md, color: theme.colors.text.primary }]}>
            Notificações de lembretes (medicamentos e consultas)
          </Text>
          <Switch value={notifications} onValueChange={setNotifications} />
        </View>

        <View style={{ marginTop: theme.spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={[theme.typography.body, { flex: 1, paddingRight: theme.spacing.md, color: theme.colors.text.primary }]}>
            Métricas de utilização anónimas (melhorar o app)
          </Text>
          <Switch value={analytics} onValueChange={setAnalytics} />
        </View>

        <View style={{ marginTop: theme.spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={[theme.typography.body, { flex: 1, paddingRight: theme.spacing.md, color: theme.colors.text.primary }]}>
            Convites a estudos clínicos futuros (opt-in)
          </Text>
          <Switch value={research} onValueChange={setResearch} />
        </View>

        <View style={{ marginTop: theme.spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={[theme.typography.body, { flex: 1, paddingRight: theme.spacing.md, color: theme.colors.text.primary }]}>
            Compartilhar resumos com a equipe de cuidados ligada ao hospital (quando existir vínculo)
          </Text>
          <Switch value={shareTeam} onValueChange={setShareTeam} />
        </View>

        <Pressable
          onPress={save}
          disabled={busy}
          style={{
            marginTop: theme.spacing.xl,
            backgroundColor: theme.colors.semantic.treatment,
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            alignItems: "center",
            opacity: busy ? 0.6 : 1,
          }}
        >
          <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Aceitar e continuar</Text>
        </Pressable>
      </ScrollView>
    </ResponsiveScreen>
  );
}
