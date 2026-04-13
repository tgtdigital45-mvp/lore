import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/auth/AuthContext";
import { appStorage } from "@/src/lib/appStorage";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { OnboardingIllustration } from "@/src/components/onboarding/OnboardingIllustration";

const LEGACY_STORAGE_KEY = "aura_onboarding_walkthrough_v1";

function onboardingKeyForUser(userId: string): string {
  return `aura_onboarding_walkthrough_v2_${userId}`;
}

async function shouldShowOnboarding(userId: string): Promise<boolean> {
  const k = onboardingKeyForUser(userId);
  if ((await appStorage.getItem(k)) === "1") return false;
  if ((await appStorage.getItem(LEGACY_STORAGE_KEY)) === "1") {
    await appStorage.setItem(k, "1");
    return false;
  }
  return true;
}

const STEPS = [
  {
    id: "resumo" as const,
    title: "Resumo",
    body: "Veja tratamento, próximas sessões e atalhos para o que importa no dia a dia.",
  },
  {
    id: "sintomas" as const,
    title: "Sintomas",
    body: "Registre sintomas em passos rápidos (como no app Saúde); a equipe vê tendências conforme as regras do hospital.",
  },
  {
    id: "privacidade" as const,
    title: "Privacidade",
    body: "Os dados respeitam consentimentos e a ligação ao hospital que você escolher.",
  },
];

export function OnboardingWalkthrough() {
  const { theme } = useAppTheme();
  const { session, loading: authLoading } = useAuth();
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const userId = session?.user?.id;

  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [checking, setChecking] = useState(true);

  const cardW = Math.min(winW - 24, 440);
  const heroH = Math.min(Math.max(cardW * 0.58, 220), 320);

  const accent = theme.colors.semantic.treatment;

  const gradientColors = useMemo(
    () => [`${accent}33`, `${accent}0D`] as [string, string],
    [accent]
  );

  const loadVisibility = useCallback(async () => {
    if (!userId) {
      setVisible(false);
      setChecking(false);
      return;
    }
    setChecking(true);
    const show = await shouldShowOnboarding(userId);
    setVisible(show);
    setChecking(false);
  }, [userId]);

  useEffect(() => {
    void loadVisibility();
  }, [loadVisibility]);

  useEffect(() => {
    setStep(0);
  }, [userId]);

  const finish = async () => {
    if (userId) await appStorage.setItem(onboardingKeyForUser(userId), "1");
    setVisible(false);
  };

  if (authLoading || checking || !userId) return null;
  if (!visible) return null;

  const bg = theme.colors.background.secondary;
  const fg = theme.colors.text.primary;
  const muted = theme.colors.text.secondary;

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={finish}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 12,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 12,
        }}
      >
        <View
          accessibilityViewIsModal
          style={{
            width: cardW,
            maxHeight: winH * 0.92,
            backgroundColor: bg,
            borderRadius: 28,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: theme.colors.border.divider,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 12, paddingTop: 8 }}>
            <Pressable
              onPress={finish}
              accessibilityRole="button"
              accessibilityLabel="Pular introdução"
              hitSlop={12}
              style={{ paddingVertical: 8, paddingHorizontal: 10 }}
            >
              <Text style={{ color: muted, fontSize: 15, fontWeight: "500" }}>Pular</Text>
            </Pressable>
          </View>

          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 20,
                minHeight: heroH + 16,
              }}
            >
              <OnboardingIllustration
                variant={STEPS[step].id}
                accent={accent}
                width={cardW - 32}
                height={heroH}
              />
            </LinearGradient>

            <View style={{ paddingHorizontal: 24, paddingTop: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 16 }}>
                {STEPS.map((s, i) => (
                  <View
                    key={s.id}
                    style={{
                      width: i === step ? 22 : 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: i === step ? accent : theme.colors.border.divider,
                      opacity: i === step ? 1 : 0.55,
                    }}
                  />
                ))}
              </View>

              <Text
                style={{ fontSize: 22, fontWeight: "700", color: fg, letterSpacing: -0.3 }}
                accessibilityRole="header"
              >
                {STEPS[step].title}
              </Text>
              <Text style={{ marginTop: 12, color: muted, lineHeight: 24, fontSize: 16 }}>{STEPS[step].body}</Text>
            </View>
          </ScrollView>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border.divider,
            }}
          >
            {step > 0 ? (
              <Pressable
                onPress={() => setStep((s) => Math.max(0, s - 1))}
                accessibilityRole="button"
                accessibilityLabel="Passo anterior"
                style={{ minHeight: 48, minWidth: 52, justifyContent: "center" }}
              >
                <Text style={{ color: accent, fontSize: 16 }}>Anterior</Text>
              </Pressable>
            ) : (
              <View style={{ minWidth: 52 }} />
            )}
            <Text style={{ color: muted, fontSize: 13 }} accessibilityLiveRegion="polite">
              {step + 1} de {STEPS.length}
            </Text>
            {step < STEPS.length - 1 ? (
              <Pressable
                onPress={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                accessibilityRole="button"
                accessibilityLabel="Próximo passo"
                style={{ minHeight: 48, minWidth: 52, justifyContent: "center", alignItems: "flex-end" }}
              >
                <Text style={{ color: accent, fontWeight: "700", fontSize: 16 }}>Próximo</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={finish}
                accessibilityRole="button"
                accessibilityLabel="Começar a usar o app"
                style={{ minHeight: 48, minWidth: 52, justifyContent: "center", alignItems: "flex-end" }}
              >
                <Text style={{ color: accent, fontWeight: "700", fontSize: 16 }}>Começar</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
