import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import type { AppTheme } from "@/src/theme/theme";
import { greetingLabel } from "@/src/home/homeScreenHelpers";

type Props = {
  theme: AppTheme;
  firstName: string;
  initials: string;
  profileAvatarUrl: string | null | undefined;
  patientAvatarUrl: string | null | undefined;
  localAvatarUri: string | null;
  avatarEpoch: number;
  onOpenProfile: () => void;
};

export function ResumoHomeGreeting({
  theme,
  firstName,
  initials,
  profileAvatarUrl,
  patientAvatarUrl,
  localAvatarUri,
  avatarEpoch,
  onOpenProfile,
}: Props) {
  const raw = profileAvatarUrl ?? patientAvatarUrl ?? localAvatarUri ?? "";
  return (
    <View style={{ paddingTop: theme.spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
        <Text style={[theme.typography.body, { color: theme.colors.text.secondary, textTransform: "uppercase", letterSpacing: 0.6 }]}>
          {greetingLabel()},
        </Text>
        <Text style={[theme.typography.largeTitle, { color: theme.colors.text.primary }]}>{firstName}</Text>
      </View>
      <Pressable
        onPress={onOpenProfile}
        accessibilityRole="button"
        accessibilityLabel="Abrir perfil e configurações"
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          overflow: "hidden",
          backgroundColor: theme.colors.semantic.symptoms,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {raw ? (
          <Image
            key={`${raw}-${avatarEpoch}`}
            source={{
              uri: (() => {
                if (!raw.startsWith("http")) return raw;
                const sep = raw.includes("?") ? "&" : "?";
                return `${raw}${sep}v=${avatarEpoch}`;
              })(),
            }}
            style={{ width: 48, height: 48 }}
            contentFit="cover"
            cachePolicy="none"
          />
        ) : (
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#FFFFFF" }}>{initials}</Text>
        )}
      </Pressable>
    </View>
  );
}
