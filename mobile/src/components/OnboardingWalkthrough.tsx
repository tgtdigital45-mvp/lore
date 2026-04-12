import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View, useWindowDimensions } from "react-native";
import { appStorage } from "@/src/lib/appStorage";
import { useAppTheme } from "@/src/hooks/useAppTheme";

const STORAGE_KEY = "aura_onboarding_walkthrough_v1";

const STEPS = [
  { title: "Resumo", body: "Veja tratamento, próximas sessões e atalhos para o que importa no dia a dia." },
  { title: "Sintomas", body: "Registe sintomas em passos rápidos (como na app Saúde); a equipa vê tendências conforme as regras do hospital." },
  { title: "Privacidade", body: "Os dados respeitam consentimentos e a ligação ao hospital que escolher." },
];

export function OnboardingWalkthrough() {
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const maxW = Math.min(400, width - 48);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    void (async () => {
      const done = await appStorage.getItem(STORAGE_KEY);
      if (done !== "1") setVisible(true);
    })();
  }, []);

  const finish = async () => {
    await appStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  const bg = theme.colors.background.secondary;
  const fg = theme.colors.text.primary;
  const muted = theme.colors.text.secondary;
  const accent = theme.colors.semantic.treatment;

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={finish}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <View
          accessibilityViewIsModal
          style={{
            width: maxW,
            backgroundColor: bg,
            borderRadius: 16,
            padding: 22,
            borderWidth: 1,
            borderColor: theme.colors.border.divider,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "600", color: fg }} accessibilityRole="header">
            {STEPS[step].title}
          </Text>
          <Text style={{ marginTop: 12, color: muted, lineHeight: 22 }}>{STEPS[step].body}</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 22, alignItems: "center" }}>
            {step > 0 ? (
              <Pressable
                onPress={() => setStep((s) => Math.max(0, s - 1))}
                accessibilityRole="button"
                accessibilityLabel="Passo anterior"
                style={{ minHeight: 48, minWidth: 48, justifyContent: "center" }}
              >
                <Text style={{ color: accent }}>Anterior</Text>
              </Pressable>
            ) : (
              <View style={{ minWidth: 48 }} />
            )}
            <Text style={{ color: muted, fontSize: 12 }} accessibilityLiveRegion="polite">
              {step + 1} / {STEPS.length}
            </Text>
            {step < STEPS.length - 1 ? (
              <Pressable
                onPress={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                accessibilityRole="button"
                accessibilityLabel="Passo seguinte"
                style={{ minHeight: 48, minWidth: 48, justifyContent: "center", alignItems: "flex-end" }}
              >
                <Text style={{ color: accent, fontWeight: "600" }}>Seguinte</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={finish}
                accessibilityRole="button"
                accessibilityLabel="Começar a usar a app"
                style={{ minHeight: 48, minWidth: 48, justifyContent: "center", alignItems: "flex-end" }}
              >
                <Text style={{ color: accent, fontWeight: "600" }}>Começar</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
