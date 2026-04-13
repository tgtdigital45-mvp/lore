import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { EmergencyModal } from "@/components/EmergencyModal";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { useAuth } from "@/src/auth/AuthContext";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { usePatient } from "@/src/hooks/usePatient";
import { getApiBaseUrl } from "@/src/lib/apiConfig";
import { notifyEmergency, ensureNotificationPermissions } from "@/src/utils/notifications";

type AgentMode = "triagem" | "suporte";

export default function AgentScreen() {
  const { session } = useAuth();
  const { theme } = useAppTheme();
  const { patient } = usePatient();
  const [mode, setMode] = useState<AgentMode>("triagem");
  const [text, setText] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [emergencyText, setEmergencyText] = useState("");

  useEffect(() => {
    void ensureNotificationPermissions();
  }, []);

  async function send() {
    if (!session?.access_token) return;
    if (mode === "triagem" && !patient) return;
    setLoading(true);
    setReply(null);
    const path = mode === "suporte" ? "/api/support/chat" : "/api/agent/process";
    try {
      const res = await fetch(`${getApiBaseUrl()}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message: text }),
      });
      const data = (await res.json()) as {
        reply?: string;
        emergency?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setReply(data.reply ?? data.error ?? "Falha ao processar mensagem.");
        setLoading(false);
        return;
      }
      setReply(data.reply ?? "");
      if (mode === "triagem" && data.emergency) {
        setEmergencyText(data.reply ?? "");
        setEmergencyOpen(true);
        await notifyEmergency("Alerta clínico", data.reply ?? "Atenção imediata recomendada.");
      }
    } catch {
      setReply("Não foi possível conectar ao servidor. Verifique EXPO_PUBLIC_API_URL e se o backend está rodando.");
    }
    setLoading(false);
  }

  if (!patient && mode === "triagem") {
    return (
      <ResponsiveScreen variant="tabGradient">
        <View style={{ flex: 1, paddingVertical: theme.spacing.md }}>
          <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Assistente</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
            Complete o cadastro em Resumo para usar a triagem clínica (Gemini), ou use Suporte ao app abaixo.
          </Text>
          <Pressable
            onPress={() => setMode("suporte")}
            style={{
              marginTop: theme.spacing.lg,
              alignSelf: "flex-start",
              backgroundColor: theme.colors.semantic.treatment,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.radius.md,
            }}
          >
            <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Suporte ao app (ChatGPT)</Text>
          </Pressable>
        </View>
      </ResponsiveScreen>
    );
  }

  return (
    <ResponsiveScreen variant="tabGradient">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={100}>
      <ScrollView
        style={{ backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingVertical: theme.spacing.md, paddingBottom: theme.spacing.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[theme.typography.largeTitle, { color: theme.colors.text.primary }]}>Assistente</Text>

        <View style={{ flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
          <Pressable
            onPress={() => setMode("triagem")}
            style={{
              flex: 1,
              padding: theme.spacing.sm,
              borderRadius: theme.radius.md,
              backgroundColor: mode === "triagem" ? theme.colors.semantic.treatment : theme.colors.background.secondary,
              alignItems: "center",
            }}
          >
            <Text style={[theme.typography.headline, { color: mode === "triagem" ? "#FFFFFF" : theme.colors.text.primary }]}>
              Triagem (Gemini)
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode("suporte")}
            style={{
              flex: 1,
              padding: theme.spacing.sm,
              borderRadius: theme.radius.md,
              backgroundColor: mode === "suporte" ? theme.colors.semantic.respiratory : theme.colors.background.secondary,
              alignItems: "center",
            }}
          >
            <Text style={[theme.typography.headline, { color: mode === "suporte" ? "#FFFFFF" : theme.colors.text.primary }]}>
              Suporte (ChatGPT)
            </Text>
          </Pressable>
        </View>

        <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.md }]}>
          {mode === "triagem"
            ? "Descreva como você está hoje. A IA organiza informações e pode registrar sintomas — não substitui seu médico."
            : "Dúvidas sobre o uso do app (não é orientação médica). Respostas pelo modelo configurado no servidor (ex.: gpt-4o-mini)."}
        </Text>

        <TextInput
          multiline
          placeholder="Ex.: Acordei com náusea forte e medi 38.1°C"
          placeholderTextColor={theme.colors.text.tertiary}
          value={text}
          onChangeText={setText}
          style={{
            marginTop: theme.spacing.lg,
            minHeight: 120,
            borderRadius: theme.radius.md,
            padding: theme.spacing.md,
            backgroundColor: theme.colors.background.secondary,
            color: theme.colors.text.primary,
            textAlignVertical: "top",
          }}
        />

        <Pressable
          onPress={send}
          disabled={loading || text.trim().length === 0}
          style={{
            marginTop: theme.spacing.md,
            backgroundColor: theme.colors.semantic.treatment,
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            alignItems: "center",
            opacity: loading || text.trim().length === 0 ? 0.5 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>
              {mode === "triagem" ? "Enviar para triagem" : "Enviar ao suporte"}
            </Text>
          )}
        </Pressable>

        {reply && (
          <View style={{ marginTop: theme.spacing.lg, padding: theme.spacing.md, borderRadius: theme.radius.lg, backgroundColor: theme.colors.background.secondary }}>
            <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Resposta</Text>
            <Text style={[theme.typography.body, { color: theme.colors.text.primary, marginTop: theme.spacing.sm }]}>{reply}</Text>
          </View>
        )}
      </ScrollView>

      <EmergencyModal visible={emergencyOpen} message={emergencyText} onClose={() => setEmergencyOpen(false)} />
      </KeyboardAvoidingView>
    </ResponsiveScreen>
  );
}
