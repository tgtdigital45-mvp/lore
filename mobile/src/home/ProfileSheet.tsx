import { useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as WebBrowser from "expo-web-browser";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { labelCancerType } from "@/src/i18n/ui";
import type { PatientRow } from "@/src/hooks/usePatient";

type TabKey = "dados" | "ficha" | "config";

type Props = {
  visible: boolean;
  onClose: () => void;
  fullName: string;
  avatarUri: string | null;
  onPressAvatar: () => void;
  patient: PatientRow | null;
  onSignOut: () => void;
};

const TERMS_URL = "https://www.gov.br/saude/pt-br/canais-atendimento/ouvidoria";
const PRIVACY_URL = "https://www.gov.br/governodigital/pt-br/privacidade-e-seguranca";

export function ProfileSheet({
  visible,
  onClose,
  fullName,
  avatarUri,
  onPressAvatar,
  patient,
  onSignOut,
}: Props) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const [tab, setTab] = useState<TabKey>("dados");
  const [notifEnabled, setNotifEnabled] = useState(true);

  const firstName = useMemo(() => {
    const t = fullName.trim();
    if (!t) return "Você";
    return t.split(/\s+/)[0] ?? t;
  }, [fullName]);

  const initials = useMemo(() => {
    const t = fullName.trim();
    if (!t) return "?";
    const parts = t.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
  }, [fullName]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            maxHeight: winH * 0.92,
            backgroundColor: theme.colors.background.primary,
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius: theme.radius.xl,
            paddingBottom: Math.max(insets.bottom, theme.spacing.md),
          }}
        >
          <View style={{ alignItems: "center", paddingTop: theme.spacing.sm }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.colors.border.divider,
              }}
            />
          </View>

          <View style={{ alignItems: "center", paddingTop: theme.spacing.lg, paddingHorizontal: theme.spacing.md }}>
            <Pressable onPress={onPressAvatar} style={{ marginBottom: theme.spacing.sm }}>
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: 44,
                    backgroundColor: theme.colors.background.secondary,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: 44,
                    backgroundColor: theme.colors.semantic.treatment,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 32, fontWeight: "700", color: "#FFFFFF" }}>{initials}</Text>
                </View>
              )}
            </Pressable>
            <Text style={[theme.typography.title1, { color: theme.colors.text.primary }]}>{fullName || "Sua conta"}</Text>
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>
              Toque na foto para alterar
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              marginTop: theme.spacing.lg,
              marginHorizontal: theme.spacing.md,
              backgroundColor: theme.colors.background.secondary,
              borderRadius: theme.radius.md,
              padding: 4,
            }}
          >
            {(
              [
                ["dados", "Dados de saúde"],
                ["ficha", "Ficha médica"],
                ["config", "Notificações"],
              ] as const
            ).map(([k, label]) => (
              <Pressable
                key={k}
                onPress={() => setTab(k)}
                style={{
                  flex: 1,
                  paddingVertical: theme.spacing.sm,
                  borderRadius: theme.radius.sm,
                  backgroundColor: tab === k ? theme.colors.background.primary : "transparent",
                  alignItems: "center",
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 12,
                    fontWeight: tab === k ? "600" : "500",
                    color: tab === k ? theme.colors.text.primary : theme.colors.text.secondary,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView
            style={{ marginTop: theme.spacing.md }}
            contentContainerStyle={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.lg }}
            showsVerticalScrollIndicator={false}
          >
            {tab === "dados" && (
              <View>
                <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
                  Aqui ficam resumos do seu dia a dia: sintomas, sinais vitais e hábitos que você acompanha no app.
                </Text>
                <Pressable
                  onPress={onClose}
                  style={{
                    marginTop: theme.spacing.md,
                    padding: theme.spacing.md,
                    borderRadius: theme.radius.md,
                    backgroundColor: theme.colors.background.secondary,
                  }}
                >
                  <Text style={[theme.typography.headline, { color: theme.colors.semantic.treatment }]}>Ver resumo na tela inicial</Text>
                  <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: 4 }]}>
                    Feche este painel para voltar ao Resumo.
                  </Text>
                </Pressable>
              </View>
            )}

            {tab === "ficha" && (
              <View>
                {!patient ? (
                  <Text style={[theme.typography.body, { color: theme.colors.text.secondary }]}>
                    Complete o cadastro para ver diagnóstico e estágio aqui.
                  </Text>
                ) : (
                  <>
                    <RowItem icon="heart" label="Câncer primário" value={labelCancerType(patient.primary_cancer_type)} theme={theme} />
                    <RowItem icon="file-text-o" label="Estágio" value={patient.current_stage ?? "—"} theme={theme} />
                    <RowItem icon="adjust" label="Nadir" value={patient.is_in_nadir ? "Sim" : "Não"} theme={theme} />
                  </>
                )}
              </View>
            )}

            {tab === "config" && (
              <View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: theme.spacing.sm,
                  }}
                >
                  <Text style={[theme.typography.body, { color: theme.colors.text.primary, flex: 1 }]}>Lembretes no aparelho</Text>
                  <Switch value={notifEnabled} onValueChange={setNotifEnabled} />
                </View>
                <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginBottom: theme.spacing.lg }]}>
                  Em breve você poderá escolher quais alertas receber.
                </Text>
                <Pressable
                  onPress={() => {
                    onSignOut();
                    onClose();
                  }}
                  style={{
                    padding: theme.spacing.md,
                    borderRadius: theme.radius.md,
                    backgroundColor: theme.colors.background.secondary,
                    alignItems: "center",
                  }}
                >
                  <Text style={[theme.typography.headline, { color: theme.colors.semantic.vitals }]}>Sair da conta</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>

          <View style={{ paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border.divider }}>
            <Text style={[theme.typography.body, { color: theme.colors.text.tertiary, fontSize: 13, textAlign: "center" }]}>
              Olá, {firstName}. Conte com o Aura para organizar seu tratamento.
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "center", gap: theme.spacing.md, marginTop: theme.spacing.md }}>
              <Pressable onPress={() => void WebBrowser.openBrowserAsync(TERMS_URL)}>
                <Text style={{ color: theme.colors.semantic.respiratory, fontWeight: "600", fontSize: 14 }}>Termos de uso</Text>
              </Pressable>
              <Text style={{ color: theme.colors.text.tertiary }}>·</Text>
              <Pressable onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_URL)}>
                <Text style={{ color: theme.colors.semantic.respiratory, fontWeight: "600", fontSize: 14 }}>Privacidade</Text>
              </Pressable>
            </View>
            <Text style={{ color: theme.colors.text.secondary, fontSize: 13, textAlign: "center", marginTop: theme.spacing.sm }}>
              Ajuda e contato: em breve no app
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function RowItem({
  icon,
  label,
  value,
  theme,
}: {
  icon: string;
  label: string;
  value: string;
  theme: ReturnType<typeof useAppTheme>["theme"];
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: theme.spacing.sm, gap: theme.spacing.md }}>
      <FontAwesome name={icon as never} size={20} color={theme.colors.semantic.treatment} style={{ width: 28 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, color: theme.colors.text.secondary }}>{label}</Text>
        <Text style={[theme.typography.headline, { color: theme.colors.text.primary }]}>{value}</Text>
      </View>
    </View>
  );
}
