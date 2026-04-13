import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/auth/AuthContext";

export default function CaregiverClaimScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const { data, error } = await supabase.rpc("claim_caregiver_pairing", { p_code: code.trim() });
    setBusy(false);
    if (error) {
      Alert.alert("Código", error.message === "code_not_found" ? "Código inválido ou já utilizado." : error.message);
      return;
    }
    void data;
    const uid = session?.user?.id;
    if (uid) {
      await queryClient.invalidateQueries({ queryKey: ["patient", uid] });
    }
    Alert.alert("Ligação criada", "Pode ver e registar dados em nome do paciente; o sistema regista o cuidador.", [
      { text: "OK", onPress: () => router.replace("/(tabs)") },
    ]);
  }

  return (
    <ResponsiveScreen variant="tabGradient">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={100}>
        <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Emparelhar com paciente</Text>
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
          Peça ao paciente o código de 6 caracteres em Perfil → Dados → Código para cuidador.
        </Text>
        <TextInput
          autoCapitalize="characters"
          value={code}
          onChangeText={setCode}
          placeholder="Código"
          placeholderTextColor={theme.colors.text.tertiary}
          style={{
            marginTop: theme.spacing.lg,
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.background.primary,
            color: theme.colors.text.primary,
            fontSize: 20,
            letterSpacing: 2,
            fontWeight: "700",
          }}
        />
        <Pressable
          onPress={() => void submit()}
          disabled={busy || code.trim().length < 4}
          style={{
            marginTop: theme.spacing.lg,
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.semantic.treatment,
            opacity: busy || code.trim().length < 4 ? 0.5 : 1,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#FFF", fontWeight: "700" }}>{busy ? "A validar…" : "Confirmar"}</Text>
        </Pressable>
      </KeyboardAvoidingView>
      </ResponsiveScreen>
  );
}
