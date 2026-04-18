import { useRef, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useAuth } from "@/src/auth/AuthContext";
import { KeyboardAccessoryDone, KEYBOARD_ACCESSORY_ID } from "@/src/components/KeyboardAccessoryDone";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { supabase } from "@/src/lib/supabase";

export default function LoginScreen() {
  const { signIn, signInWithGoogle } = useAuth();
  const { theme } = useAppTheme();
  const router = useRouter();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    const res = await signIn(email.trim(), password);
    setBusy(false);
    if (res.error) {
      Alert.alert("Autenticação", res.error);
      return;
    }
    router.replace("/");
  }

  const inputStyle = {
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background.tertiary,
    color: theme.colors.text.primary,
  } as const;

  return (
    <ResponsiveScreen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "center", paddingVertical: theme.spacing.lg }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View>
            <View style={{ alignItems: "center", marginBottom: theme.spacing.md }}>
              <Image source={require("../assets/images/logo-A.png")} style={{ width: 80, height: 80 }} resizeMode="contain" />
              <Text style={[theme.typography.largeTitle, { color: theme.colors.text.primary, marginTop: theme.spacing.sm }]}>
                Aura Onco
              </Text>
              <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm, textAlign: "center" }]}>
                Entre com e-mail e senha ou continue com o Google.
              </Text>
            </View>

            <KeyboardAccessoryDone />

            <TextInput
              placeholder="E-mail"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="username"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => passwordRef.current?.focus()}
              placeholderTextColor={theme.colors.text.tertiary}
              value={email}
              onChangeText={setEmail}
              style={{ ...inputStyle, marginTop: theme.spacing.lg }}
              inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_ACCESSORY_ID : undefined}
            />

            <View style={{ marginTop: theme.spacing.md, flexDirection: "row", alignItems: "center" }}>
              <TextInput
                ref={passwordRef}
                placeholder="Senha"
                secureTextEntry={!showPassword}
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={() => void onSubmit()}
                placeholderTextColor={theme.colors.text.tertiary}
                value={password}
                onChangeText={setPassword}
                style={{ ...inputStyle, marginTop: 0, flex: 1 }}
                inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_ACCESSORY_ID : undefined}
              />
              <Pressable
                onPress={() => setShowPassword((s) => !s)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Ocultar senha" : "Mostrar senha"}
                style={{ marginLeft: theme.spacing.sm, padding: theme.spacing.sm }}
              >
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={24} color={theme.colors.text.secondary} />
              </Pressable>
            </View>

            <Pressable
              onPress={() => void onSubmit()}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Entrar com e-mail"
              style={{
                marginTop: theme.spacing.lg,
                backgroundColor: theme.colors.semantic.treatment,
                paddingVertical: theme.spacing.md,
                paddingHorizontal: theme.spacing.lg,
                minHeight: 48,
                borderRadius: theme.radius.md,
                alignItems: "center",
                justifyContent: "center",
                opacity: busy ? 0.6 : 1,
              }}
            >
              <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Entrar</Text>
            </Pressable>

            <Pressable
              onPress={async () => {
                try {
                  setBusy(true);
                  console.log("[login] signInWithGoogle — iniciando");
                  const res = await signInWithGoogle();
                  console.log("[login] signInWithGoogle — resultado:", res);
                  if (res.error) {
                    setBusy(false);
                    console.error("[login] signInWithGoogle — erro do fluxo:", res.error);
                    Alert.alert("Google", res.error);
                    return;
                  }
                  for (let i = 0; i < 20; i++) {
                    const { data } = await supabase.auth.getSession();
                    if (__DEV__) {
                      console.log("[login] poll sessão", i + 1, "/20", "user:", data.session?.user?.id ?? null);
                    }
                    if (data.session?.user) {
                      console.log("[login] sessão confirmada na tentativa", i + 1);
                      setBusy(false);
                      router.replace("/");
                      return;
                    }
                    await new Promise((r) => setTimeout(r, 250));
                  }
                  setBusy(false);
                  console.error("[login] timeout ao confirmar sessão após Google (20 tentativas)");
                  Alert.alert("Google", "Não foi possível confirmar a sessão. Tente de novo ou use e-mail e senha.");
                } catch (e) {
                  console.error("[login] erro inesperado no login Google:", e);
                  setBusy(false);
                  Alert.alert("Google", "Erro inesperado. Tente de novo.");
                }
              }}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Continuar com Google"
              style={{
                marginTop: theme.spacing.md,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: theme.spacing.sm,
                backgroundColor: theme.colors.background.secondary,
                paddingVertical: theme.spacing.md,
                paddingHorizontal: theme.spacing.lg,
                minHeight: 48,
                borderRadius: theme.radius.md,
                opacity: busy ? 0.6 : 1,
              }}
            >
              <Ionicons name="logo-google" size={22} color={theme.colors.text.primary} />
              <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>Continuar com Google</Text>
            </Pressable>
            <Text
              style={[
                theme.typography.caption1,
                { color: theme.colors.text.tertiary, marginTop: theme.spacing.sm, textAlign: "center", paddingHorizontal: theme.spacing.md },
              ]}
            >
              Primeira vez? Ao continuar com o Google, a sua conta é criada automaticamente (se o registo estiver permitido no servidor).
            </Text>

            <Pressable onPress={() => router.push("/signup")} style={{ marginTop: theme.spacing.lg }} accessibilityRole="link">
              <Text style={[theme.typography.body, { color: theme.colors.semantic.respiratory, textAlign: "center" }]}>
                Não tem conta? Cadastre-se
              </Text>
            </Pressable>

            <Link href="/" style={{ marginTop: theme.spacing.lg }}>
              <Text style={{ color: theme.colors.text.secondary, textAlign: "center" }}>Voltar</Text>
            </Link>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ResponsiveScreen>
  );
}
