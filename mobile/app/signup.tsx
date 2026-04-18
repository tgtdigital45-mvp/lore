import { useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/src/auth/AuthContext";
import { KeyboardAccessoryDone, KEYBOARD_ACCESSORY_ID } from "@/src/components/KeyboardAccessoryDone";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { DEMO_HOSPITAL_ID } from "@/src/constants/hospital";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { labelCancerType } from "@/src/i18n/ui";
import { parsePhoneToE164 } from "@/src/lib/phoneE164";
import { supabase } from "@/src/lib/supabase";
import { onboardingPatientInsertSchema } from "@/src/validation/onboardingPatient";
import { ZodError } from "zod";

const CANCER_TYPES = ["breast", "lung", "prostate", "leukemia", "colorectal", "other"] as const;

export default function SignupScreen() {
  const { signUp, signInWithGoogle } = useAuth();
  const queryClient = useQueryClient();
  const { theme } = useAppTheme();
  const router = useRouter();
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"patient" | "caregiver">("patient");
  const [cancer, setCancer] = useState<(typeof CANCER_TYPES)[number]>("other");
  const [stage, setStage] = useState("");
  const [busy, setBusy] = useState(false);

  const inputStyle = {
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background.tertiary,
    color: theme.colors.text.primary,
  } as const;

  async function onSubmit() {
    const phoneE164 = parsePhoneToE164(phone);
    if (!phoneE164) {
      Alert.alert("Telefone", "Indique um telefone válido (ex.: 11999999999 ou +5511999999999).");
      return;
    }
    if (!name.trim()) {
      Alert.alert("Nome", "Indique o seu nome.");
      return;
    }

    setBusy(true);
    const res = await signUp(email.trim(), password, name.trim());
    if (res.error) {
      setBusy(false);
      Alert.alert("Cadastro", res.error);
      return;
    }

    const { data: sess } = await supabase.auth.getSession();
    const user = sess.session?.user;
    if (!user) {
      setBusy(false);
      Alert.alert(
        "Confirme o e-mail",
        "Se o servidor exigir confirmação, abra a mensagem e volte a entrar. Depois complete o cadastro em Perfil se necessário.",
        [{ text: "Entrar", onPress: () => router.replace("/login") }],
      );
      return;
    }

    const { error: pe } = await supabase
      .from("profiles")
      .update({
        full_name: name.trim(),
        phone_e164: phoneE164,
        role,
      })
      .eq("id", user.id);

    if (pe) {
      setBusy(false);
      Alert.alert("Perfil", pe.message);
      return;
    }

    if (role === "caregiver") {
      await queryClient.invalidateQueries({ queryKey: ["patient", user.id] });
      setBusy(false);
      router.replace("/caregiver-claim");
      return;
    }

    let insertRow: ReturnType<typeof onboardingPatientInsertSchema.parse>;
    try {
      insertRow = onboardingPatientInsertSchema.parse({
        profile_id: user.id,
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

    const { error: insErr } = await supabase.from("patients").insert(insertRow);
    if (insErr) {
      setBusy(false);
      Alert.alert(
        "Prontuário",
        `${insErr.message}\n\nPode completar os dados em Cadastro.`,
        [{ text: "OK", onPress: () => router.replace("/onboarding") }],
      );
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ["patient", user.id] });
    setBusy(false);
    router.replace("/");
  }

  async function onGoogle() {
    setBusy(true);
    const res = await signInWithGoogle();
    if (res.error) {
      setBusy(false);
      Alert.alert("Google", res.error);
      return;
    }
    for (let i = 0; i < 20; i++) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setBusy(false);
        router.replace("/");
        return;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    setBusy(false);
    Alert.alert("Google", "Não foi possível confirmar a sessão. Tente de novo ou use e-mail e senha.");
  }

  return (
    <ResponsiveScreen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={64}>
        <ScrollView contentContainerStyle={{ paddingVertical: theme.spacing.lg, paddingBottom: theme.spacing.xl }} keyboardShouldPersistTaps="handled">
          <KeyboardAccessoryDone />

          <View style={{ alignItems: "center", marginBottom: theme.spacing.md }}>
            <Image source={require("../assets/images/logo-A.png")} style={{ width: 72, height: 72 }} resizeMode="contain" />
            <Text style={[theme.typography.largeTitle, { color: theme.colors.text.primary, marginTop: theme.spacing.sm }]}>Aura Onco</Text>
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm, textAlign: "center" }]}>
              Crie a sua conta com e-mail ou com Google. Pacientes
              podem indicar tipo de câncer; cuidadores emparelham depois com um código.
            </Text>
          </View>

          <Pressable
            onPress={() => void onGoogle()}
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
              {
                color: theme.colors.text.tertiary,
                marginTop: theme.spacing.sm,
                textAlign: "center",
                paddingHorizontal: theme.spacing.sm,
              },
            ]}
          >
            A conta é criada no servidor Aura (Supabase). Se for a primeira vez, complete tipo de perfil e dados clínicos no
            resumo ou no assistente, como no cadastro por e-mail.
          </Text>

          <Text
            style={[
              theme.typography.caption1,
              {
                color: theme.colors.text.tertiary,
                marginTop: theme.spacing.lg,
                marginBottom: theme.spacing.xs,
                textAlign: "center",
              },
            ]}
          >
            ou preencha com e-mail e senha
          </Text>

          <Text style={[theme.typography.headline, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>Sou</Text>
          <View style={{ flexDirection: "row", gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
            <Pressable
              onPress={() => setRole("patient")}
              style={{
                flex: 1,
                padding: theme.spacing.md,
                borderRadius: theme.radius.md,
                backgroundColor: role === "patient" ? theme.colors.semantic.treatment : theme.colors.background.tertiary,
                alignItems: "center",
              }}
            >
              <Text style={[theme.typography.headline, { color: role === "patient" ? "#fff" : theme.colors.text.primary }]}>Paciente</Text>
            </Pressable>
            <Pressable
              onPress={() => setRole("caregiver")}
              style={{
                flex: 1,
                padding: theme.spacing.md,
                borderRadius: theme.radius.md,
                backgroundColor: role === "caregiver" ? theme.colors.semantic.treatment : theme.colors.background.tertiary,
                alignItems: "center",
              }}
            >
              <Text style={[theme.typography.headline, { color: role === "caregiver" ? "#fff" : theme.colors.text.primary }]}>Cuidador(a)</Text>
            </Pressable>
          </View>

          {role === "patient" && (
            <>
              <Text style={[theme.typography.body, { marginTop: theme.spacing.lg, color: theme.colors.text.secondary }]}>Tipo de câncer (resumo)</Text>
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
              <Text style={[theme.typography.body, { marginTop: theme.spacing.lg, color: theme.colors.text.secondary }]}>Estágio (opcional)</Text>
              <TextInput
                placeholder="Ex.: estádio III"
                placeholderTextColor={theme.colors.text.tertiary}
                value={stage}
                onChangeText={setStage}
                style={inputStyle}
                inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_ACCESSORY_ID : undefined}
              />
            </>
          )}

          <Text style={[theme.typography.body, { marginTop: theme.spacing.lg, color: theme.colors.text.secondary }]}>Nome completo</Text>
          <TextInput
            placeholder="Nome"
            placeholderTextColor={theme.colors.text.tertiary}
            value={name}
            onChangeText={setName}
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => phoneRef.current?.focus()}
            style={inputStyle}
            inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_ACCESSORY_ID : undefined}
          />

          <Text style={[theme.typography.body, { marginTop: theme.spacing.md, color: theme.colors.text.secondary }]}>Telefone (WhatsApp)</Text>
          <TextInput
            ref={phoneRef}
            placeholder="11999999999 ou +5511999999999"
            placeholderTextColor={theme.colors.text.tertiary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => emailRef.current?.focus()}
            style={inputStyle}
            inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_ACCESSORY_ID : undefined}
          />

          <Text style={[theme.typography.body, { marginTop: theme.spacing.md, color: theme.colors.text.secondary }]}>E-mail</Text>
          <TextInput
            ref={emailRef}
            placeholder="E-mail"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => passwordRef.current?.focus()}
            placeholderTextColor={theme.colors.text.tertiary}
            value={email}
            onChangeText={setEmail}
            style={inputStyle}
            inputAccessoryViewID={Platform.OS === "ios" ? KEYBOARD_ACCESSORY_ID : undefined}
          />

          <Text style={[theme.typography.body, { marginTop: theme.spacing.md, color: theme.colors.text.secondary }]}>Senha</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TextInput
              ref={passwordRef}
              placeholder="Senha"
              secureTextEntry={!showPassword}
              autoComplete="password-new"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={() => void onSubmit()}
              placeholderTextColor={theme.colors.text.tertiary}
              value={password}
              onChangeText={setPassword}
              style={{ ...inputStyle, flex: 1, marginTop: 0 }}
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
            accessibilityLabel="Criar conta"
            style={{
              marginTop: theme.spacing.xl,
              backgroundColor: theme.colors.semantic.treatment,
              paddingVertical: theme.spacing.md,
              borderRadius: theme.radius.md,
              alignItems: "center",
              opacity: busy ? 0.6 : 1,
            }}
          >
            <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Criar conta</Text>
          </Pressable>

          <Pressable onPress={() => router.replace("/login")} style={{ marginTop: theme.spacing.lg }} accessibilityRole="link">
            <Text style={[theme.typography.body, { color: theme.colors.semantic.respiratory, textAlign: "center" }]}>Já tem conta? Entrar</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ResponsiveScreen>
  );
}
