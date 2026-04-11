import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useAuth } from "@/src/auth/AuthContext";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { useAppTheme } from "@/src/hooks/useAppTheme";

export default function LoginScreen() {
  const { signIn, signUp, signInWithGoogle, signInWithApple } = useAuth();
  const { theme } = useAppTheme();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    const res =
      mode === "login"
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, name.trim());
    setBusy(false);
    if (res.error) {
      Alert.alert("Autenticação", res.error);
      return;
    }
    router.replace("/");
  }

  return (
    <ResponsiveScreen>
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, justifyContent: "center", paddingVertical: theme.spacing.lg }}
    >
      <Text style={[theme.typography.largeTitle, { color: theme.colors.text.primary }]}>Onco</Text>
      <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
        Um dia de cada vez
      </Text>

      {mode === "signup" && (
        <TextInput
          placeholder="Nome"
          placeholderTextColor={theme.colors.text.tertiary}
          value={name}
          onChangeText={setName}
          style={{
            marginTop: theme.spacing.lg,
            borderRadius: theme.radius.md,
            padding: theme.spacing.md,
            backgroundColor: theme.colors.background.tertiary,
            color: theme.colors.text.primary,
          }}
        />
      )}

      <TextInput
        placeholder="E-mail"
        autoCapitalize="none"
        keyboardType="email-address"
        placeholderTextColor={theme.colors.text.tertiary}
        value={email}
        onChangeText={setEmail}
        style={{
          marginTop: theme.spacing.md,
          borderRadius: theme.radius.md,
          padding: theme.spacing.md,
          backgroundColor: theme.colors.background.tertiary,
          color: theme.colors.text.primary,
        }}
      />
      <TextInput
        placeholder="Senha"
        secureTextEntry
        placeholderTextColor={theme.colors.text.tertiary}
        value={password}
        onChangeText={setPassword}
        style={{
          marginTop: theme.spacing.md,
          borderRadius: theme.radius.md,
          padding: theme.spacing.md,
          backgroundColor: theme.colors.background.tertiary,
          color: theme.colors.text.primary,
        }}
      />

      <Pressable
        onPress={onSubmit}
        disabled={busy}
        style={{
          marginTop: theme.spacing.lg,
          backgroundColor: theme.colors.semantic.treatment,
          padding: theme.spacing.md,
          borderRadius: theme.radius.md,
          alignItems: "center",
          opacity: busy ? 0.6 : 1,
        }}
      >
        <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>{mode === "login" ? "Entrar" : "Criar conta"}</Text>
      </Pressable>

      <Pressable
        onPress={async () => {
          setBusy(true);
          const res = await signInWithGoogle();
          setBusy(false);
          if (res.error) Alert.alert("Google", res.error);
          else router.replace("/");
        }}
        disabled={busy}
        style={{
          marginTop: theme.spacing.md,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: theme.spacing.sm,
          backgroundColor: theme.colors.background.secondary,
          padding: theme.spacing.md,
          borderRadius: theme.radius.md,
          opacity: busy ? 0.6 : 1,
        }}
      >
        <Ionicons name="logo-google" size={22} color={theme.colors.text.primary} />
        <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>Continuar com Google</Text>
      </Pressable>

      {Platform.OS === "ios" ? (
        <Pressable
          onPress={async () => {
            setBusy(true);
            const res = await signInWithApple();
            setBusy(false);
            if (res.error) Alert.alert("Apple", res.error);
            else router.replace("/");
          }}
          disabled={busy}
          style={{
            marginTop: theme.spacing.sm,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: theme.spacing.sm,
            backgroundColor: "#000000",
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            opacity: busy ? 0.6 : 1,
          }}
        >
          <FontAwesome name="apple" size={22} color="#FFFFFF" />
          <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Continuar com Apple</Text>
        </Pressable>
      ) : null}

      <Pressable onPress={() => setMode(mode === "login" ? "signup" : "login")} style={{ marginTop: theme.spacing.md }}>
        <Text style={[theme.typography.body, { color: theme.colors.semantic.respiratory }]}>
          {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
        </Text>
      </Pressable>

      <Link href="/" style={{ marginTop: theme.spacing.lg }}>
        <Text style={{ color: theme.colors.text.secondary }}>Voltar</Text>
      </Link>
    </KeyboardAvoidingView>
    </ResponsiveScreen>
  );
}
