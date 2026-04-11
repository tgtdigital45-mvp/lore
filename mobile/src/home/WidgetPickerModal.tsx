import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { RESUMO_WIDGET_CATALOG, type WidgetCategory } from "@/src/home/resumoWidgets";

const CATEGORY_LABEL: Record<WidgetCategory, string> = {
  exames: "Exames e gráficos",
  sintomas: "Sintomas",
  sinais_vitais: "Sinais vitais",
  atividade: "Atividade",
  nutricao: "Nutrição e hábitos",
};

type Props = {
  visible: boolean;
  onClose: () => void;
  selectedIds: string[];
  onSave: (ids: string[]) => void;
};

export function WidgetPickerModal({ visible, onClose, selectedIds, onSave }: Props) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const [local, setLocal] = useState<string[]>(selectedIds);

  useEffect(() => {
    if (visible) setLocal(selectedIds);
  }, [visible, selectedIds]);

  const byCat = useMemo(() => {
    const m = new Map<WidgetCategory, typeof RESUMO_WIDGET_CATALOG>();
    for (const w of RESUMO_WIDGET_CATALOG) {
      const list = m.get(w.category) ?? [];
      list.push(w);
      m.set(w.category, list);
    }
    return m;
  }, []);

  function toggle(id: string) {
    setLocal((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            maxHeight: winH * 0.88,
            backgroundColor: theme.colors.background.primary,
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius: theme.radius.xl,
            paddingBottom: Math.max(insets.bottom, theme.spacing.md),
          }}
        >
          <View style={{ paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.lg }}>
            <Text style={[theme.typography.title2, { color: theme.colors.text.primary }]}>Métricas em foco</Text>
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.xs }]}>
              Escolha o que aparece no resumo. Você pode misturar exames, sintomas, vitais e hábitos.
            </Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
            {(Array.from(byCat.entries()) as [WidgetCategory, typeof RESUMO_WIDGET_CATALOG][]).map(([cat, items]) => (
              <View key={cat} style={{ marginBottom: theme.spacing.lg }}>
                <Text style={[theme.typography.headline, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>
                  {CATEGORY_LABEL[cat]}
                </Text>
                {items.map((w) => {
                  const on = local.includes(w.id);
                  return (
                    <Pressable
                      key={w.id}
                      onPress={() => toggle(w.id)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: theme.spacing.sm,
                        paddingHorizontal: theme.spacing.md,
                        marginBottom: theme.spacing.xs,
                        borderRadius: theme.radius.md,
                        backgroundColor: theme.colors.background.secondary,
                      }}
                    >
                      <FontAwesome
                        name={on ? "check-circle" : "circle-o"}
                        size={22}
                        color={on ? theme.colors.semantic.treatment : theme.colors.text.tertiary}
                        style={{ marginRight: theme.spacing.md }}
                      />
                      <Text style={[theme.typography.body, { color: theme.colors.text.primary, flex: 1 }]}>{w.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
          <View style={{ flexDirection: "row", gap: theme.spacing.sm, paddingHorizontal: theme.spacing.md }}>
            <Pressable
              onPress={onClose}
              style={{
                flex: 1,
                padding: theme.spacing.md,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.background.secondary,
                alignItems: "center",
              }}
            >
              <Text style={[theme.typography.headline, { color: theme.colors.text.secondary }]}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onSave(local);
                onClose();
              }}
              style={{
                flex: 1,
                padding: theme.spacing.md,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.semantic.treatment,
                alignItems: "center",
              }}
            >
              <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>Aplicar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
