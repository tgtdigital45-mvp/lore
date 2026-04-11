import { Image, Platform, Pressable, ScrollView, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { ResponsiveScreen } from "@/src/components/ResponsiveScreen";
import { CircleChromeButton } from "@/src/health/components/MedicationChromeButtons";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import { healthRel } from "@/src/health/referenceImages";
import { useAppTheme } from "@/src/hooks/useAppTheme";

export default function MedicationsLandingScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();

  return (
    <ResponsiveScreen variant="tabGradient">
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
        }}
      >
        <CircleChromeButton accessibilityLabel="Voltar" onPress={() => router.back()}>
          <FontAwesome name="chevron-left" size={18} color={theme.colors.text.primary} />
        </CircleChromeButton>
        <Text
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 17,
            fontWeight: "600",
            color: theme.colors.text.primary,
            letterSpacing: Platform.OS === "ios" ? -0.41 : 0,
          }}
        >
          Medicamentos
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.xl * 2 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: theme.colors.background.primary,
            borderRadius: 32,
            paddingBottom: theme.spacing.lg,
            overflow: "hidden",
            ...IOS_HEALTH.shadow.card,
          }}
        >
          <Image
            source={healthRel["1"]}
            style={{ width: "100%", height: 220 }}
            resizeMode="contain"
            accessibilityLabel="Ilustração de medicamentos"
          />

          <Text
            style={{
              fontSize: 22,
              fontWeight: "700",
              textAlign: "center",
              color: theme.colors.text.primary,
              paddingHorizontal: theme.spacing.lg,
              marginTop: theme.spacing.sm,
            }}
          >
            Configure seus medicamentos
          </Text>

          <View style={{ paddingHorizontal: theme.spacing.lg, marginTop: theme.spacing.lg }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: theme.spacing.md }}>
              <FontAwesome name="medkit" size={22} color={IOS_HEALTH.blue} style={{ marginTop: 2, marginRight: theme.spacing.md }} />
              <Text style={[theme.typography.body, { flex: 1, color: theme.colors.text.primary }]}>
                Controle todos os seus medicamentos em apenas um lugar.
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: theme.spacing.md }}>
              <FontAwesome name="calendar" size={22} color={IOS_HEALTH.blue} style={{ marginTop: 2, marginRight: theme.spacing.md }} />
              <Text style={[theme.typography.body, { flex: 1, color: theme.colors.text.primary }]}>
                Defina horários e receba lembretes.
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: IOS_HEALTH.destructive,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 2,
                  marginRight: theme.spacing.md,
                }}
              >
                <FontAwesome name="lock" size={12} color="#FFFFFF" />
              </View>
              <Text style={[theme.typography.body, { flex: 1, color: theme.colors.text.primary }]}>
                As informações sobre os seus medicamentos são criptografadas e não podem ser lidas por ninguém, incluindo a
                Apple, sem a sua permissão.
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => router.push("/(tabs)/health/medications/name" as Href)}
            style={({ pressed }) => ({
              marginHorizontal: theme.spacing.lg,
              marginTop: theme.spacing.lg,
              backgroundColor: IOS_HEALTH.blue,
              paddingVertical: 14,
              borderRadius: IOS_HEALTH.pillButtonRadius,
              alignItems: "center",
              opacity: pressed ? 0.88 : 1,
            })}
          >
            <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Adicionar um medicamento</Text>
          </Pressable>
        </View>

        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            color: theme.colors.text.primary,
            marginTop: theme.spacing.xl,
            marginBottom: theme.spacing.sm,
          }}
        >
          Sobre medicamentos
        </Text>

        <View
          style={{
            backgroundColor: theme.colors.background.primary,
            borderRadius: theme.radius.lg,
            overflow: "hidden",
            ...IOS_HEALTH.shadow.card,
          }}
        >
          <Image source={healthRel["1.1"]} style={{ width: "100%", height: 160 }} resizeMode="cover" />
          <View style={{ padding: theme.spacing.md }}>
            <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Monitorando seus medicamentos</Text>
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.sm }]}>
              Por que é importante saber o que você está tomando.
            </Text>
          </View>
        </View>

        <Text
          style={{
            fontSize: 12,
            color: theme.colors.text.tertiary,
            marginTop: theme.spacing.lg,
            textAlign: "center",
          }}
        >
          Fluxo completo de lembretes integrará Supabase e notificações locais (roadmap).
        </Text>
      </ScrollView>
    </ResponsiveScreen>
  );
}
