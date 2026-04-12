import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/auth/AuthContext";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { DEMO_HOSPITAL_ID } from "@/src/constants/hospital";
import { labelCancerType } from "@/src/i18n/ui";

const CANCER_TYPES = ["breast", "lung", "prostate", "leukemia", "colorectal", "other"] as const;

export default function OnboardingScreen() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { theme } = useAppTheme();
  const router = useRouter();
  const [stage, setStage] = useState("");
  const [cancer, setCancer] = useState<(typeof CANCER_TYPES)[number]>("other");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!session?.user) return;
    setBusy(true);
    const { error } = await supabase.from("patients").insert({
      profile_id: session.user.id,
      primary_cancer_type: cancer,
      current_stage: stage.trim() || null,
      hospital_id: DEMO_HOSPITAL_ID,
    });
    setBusy(false);
    if (error) {
      Alert.alert("Cadastro", error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["patient", session.user.id] });
    router.replace("/(tabs)");
  }

  return (
    <ResponsiveScreen>
    <ScrollView contentContainerStyle={{ paddingVertical: theme.spacing.lg, paddingBottom: theme.spacing.xl }}>
      <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>Seu prontuário</Text>
      <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
        Informações usadas apenas para personalizar alertas e o diário (LGPD / HIPAA via RLS).
      </Text>

      <Text style={[theme.typography.body, { marginTop: theme.spacing.lg, color: theme.colors.text.secondary }]}>
        Tipo de câncer (resumo)
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
        {CANCER_TYPES.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCancer(c)}
            style={{
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.radius.md,
              backgroundColor: cancer === c ? theme.colors.semantic.treatment : theme.colors.background.secondary,
            }}
          >
            <Text style={{ color: theme.colors.text.primary }}>{labelCancerType(c)}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[theme.typography.body, { marginTop: theme.spacing.lg, color: theme.colors.text.secondary }]}>
        Estágio (opcional)
      </Text>
      <TextInput
        placeholder="Ex.: estádio III"
        placeholderTextColor={theme.colors.text.tertiary}
        value={stage}
        onChangeText={setStage}
        style={{
          marginTop: theme.spacing.sm,
          borderRadius: theme.radius.md,
          padding: theme.spacing.md,
          backgroundColor: theme.colors.background.tertiary,
          color: theme.colors.text.primary,
        }}
      />

      <Pressable
        onPress={save}
        disabled={busy}
        style={{
          marginTop: theme.spacing.xl,
          backgroundColor: theme.colors.semantic.nutrition,
          padding: theme.spacing.md,
          borderRadius: theme.radius.md,
          alignItems: "center",
          opacity: busy ? 0.6 : 1,
        }}
      >
        <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Salvar e continuar</Text>
      </Pressable>
    </ScrollView>
    </ResponsiveScreen>
  );
}
