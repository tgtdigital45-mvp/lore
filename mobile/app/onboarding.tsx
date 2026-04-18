import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/auth/AuthContext";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { DEMO_HOSPITAL_ID } from "@/src/constants/hospital";
import { labelCancerType } from "@/src/i18n/ui";
import { usePatient } from "@/src/hooks/usePatient";
import { onboardingPatientInsertSchema } from "@/src/validation/onboardingPatient";
import { ZodError } from "zod";

const CANCER_TYPES = ["breast", "lung", "prostate", "leukemia", "colorectal", "other"] as const;

type Step = "loading" | "choose" | "patient" | "caregiver_wait";

export default function OnboardingScreen() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { theme } = useAppTheme();
  const router = useRouter();
  const { patient, loading: patientLoading } = usePatient();

  const [step, setStep] = useState<Step>("loading");
  const [stage, setStage] = useState("");
  const [cancer, setCancer] = useState<(typeof CANCER_TYPES)[number]>("other");
  const [busy, setBusy] = useState(false);

  const uid = session?.user?.id;

  const resolveInitialStep = useCallback(async (): Promise<Step> => {
    if (!uid) return "choose";
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle();
    const role = prof?.role ?? "patient";
    if (role === "caregiver") {
      const { data: link } = await supabase
        .from("patient_caregivers")
        .select("patient_id")
        .eq("caregiver_profile_id", uid)
        .limit(1)
        .maybeSingle();
      if (link?.patient_id) return "choose";
      return "caregiver_wait";
    }
    return "choose";
  }, [uid]);

  useEffect(() => {
    if (patientLoading || !uid) return;
    if (patient) {
      router.replace("/(tabs)");
      return;
    }
    void (async () => {
      const s = await resolveInitialStep();
      setStep(s);
    })();
  }, [uid, patient, patientLoading, router, resolveInitialStep]);

  async function setCaregiverRoleAndGoClaim() {
    if (!session?.user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ role: "caregiver" }).eq("id", session.user.id);
    setBusy(false);
    if (error) {
      Alert.alert("Perfil", error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["patient", session.user.id] });
    router.push("/caregiver-claim");
  }

  async function savePatient() {
    if (!session?.user) return;
    setBusy(true);
    const { error: pe } = await supabase.from("profiles").update({ role: "patient" }).eq("id", session.user.id);
    if (pe) {
      setBusy(false);
      Alert.alert("Cadastro", pe.message);
      return;
    }
    let insertRow: ReturnType<typeof onboardingPatientInsertSchema.parse>;
    try {
      insertRow = onboardingPatientInsertSchema.parse({
        profile_id: session.user.id,
        primary_cancer_type: cancer,
        current_stage: stage.trim() || null,
        hospital_id: DEMO_HOSPITAL_ID,
      });
    } catch (e) {
      setBusy(false);
      if (e instanceof ZodError) {
        Alert.alert("Validação", e.errors.map((x) => x.message).join("\n"));
        return;
      }
      throw e;
    }
    const { error } = await supabase.from("patients").insert(insertRow);
    setBusy(false);
    if (error) {
      Alert.alert("Cadastro", error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["patient", session.user.id] });
    router.replace("/(tabs)");
  }

  if (!uid || patientLoading || step === "loading") {
    return (
      <ResponsiveScreen>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: theme.spacing.xl }}>
          <ActivityIndicator />
        </View>
      </ResponsiveScreen>
    );
  }

  if (step === "choose") {
    return (
      <ResponsiveScreen>
        <ScrollView contentContainerStyle={{ paddingVertical: theme.spacing.lg, paddingBottom: theme.spacing.xl }}>
          <Pressable
            onPress={() => router.back()}
            style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing.md }}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <FontAwesome name="chevron-left" size={16} color={theme.colors.semantic.treatment} />
            <Text style={[theme.typography.body, { color: theme.colors.semantic.treatment, marginLeft: theme.spacing.xs }]}>Voltar</Text>
          </Pressable>
          <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>Como vai usar o Aura?</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
            Escolha uma opção. Pode alterar o vínculo de cuidador mais tarde em Perfil.
          </Text>

          <Pressable
            onPress={() => setStep("patient")}
            style={{
              marginTop: theme.spacing.xl,
              padding: theme.spacing.lg,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.semantic.treatment,
            }}
          >
            <Text style={[theme.typography.headline, { color: "#fff" }]}>Sou paciente</Text>
            <Text style={[theme.typography.body, { color: "rgba(255,255,255,0.9)", marginTop: 6 }]}>
              Diário, sintomas e tratamento no meu nome.
            </Text>
          </Pressable>

          <Pressable
            onPress={() => void setCaregiverRoleAndGoClaim()}
            disabled={busy}
            style={{
              marginTop: theme.spacing.md,
              padding: theme.spacing.lg,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.background.tertiary,
              borderWidth: 1,
              borderColor: theme.colors.border.divider,
              opacity: busy ? 0.6 : 1,
            }}
          >
            <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>Sou cuidador(a)</Text>
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 6 }]}>
              Vou acompanhar o paciente com um código de emparelhamento. Leio e registo em nome dele; fica registado que foi o cuidador.
            </Text>
          </Pressable>
        </ScrollView>
      </ResponsiveScreen>
    );
  }

  if (step === "caregiver_wait") {
    return (
      <ResponsiveScreen>
        <ScrollView contentContainerStyle={{ paddingVertical: theme.spacing.lg, paddingBottom: theme.spacing.xl }}>
          <Pressable
            onPress={() => setStep("choose")}
            style={{ flexDirection: "row", alignItems: "center", marginBottom: theme.spacing.md }}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <FontAwesome name="chevron-left" size={16} color={theme.colors.semantic.treatment} />
            <Text style={[theme.typography.body, { color: theme.colors.semantic.treatment, marginLeft: theme.spacing.xs }]}>Voltar</Text>
          </Pressable>
          <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>Emparelhar com o paciente</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
            Peça ao paciente o código em Perfil → Código para cuidador. Depois de inserir, passa a ver o prontuário dele.
          </Text>
          <Pressable
            onPress={() => router.push("/caregiver-claim")}
            style={{
              marginTop: theme.spacing.xl,
              padding: theme.spacing.md,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.semantic.treatment,
              alignItems: "center",
            }}
          >
            <Text style={[theme.typography.headline, { color: "#fff" }]}>Inserir código</Text>
          </Pressable>
        </ScrollView>
      </ResponsiveScreen>
    );
  }

  return (
    <ResponsiveScreen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={100}>
      <ScrollView contentContainerStyle={{ paddingVertical: theme.spacing.lg, paddingBottom: theme.spacing.xl }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => setStep("choose")} style={{ marginBottom: theme.spacing.md }}>
          <Text style={[theme.typography.body, { color: theme.colors.semantic.treatment }]}>‹ Voltar</Text>
        </Pressable>
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
          onPress={savePatient}
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
      </KeyboardAvoidingView>
    </ResponsiveScreen>
  );
}
