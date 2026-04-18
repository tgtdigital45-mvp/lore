import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModal } from "@/src/components/BottomSheetModal";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import {
  RESUMO_WIDGET_CATALOG,
  RESUMO_WIDGET_CATEGORY_ORDER,
  type WidgetCategory,
} from "@/src/home/resumoWidgets";

const CATEGORY_LABEL: Record<WidgetCategory, string> = {
  exames: "Exames e gráficos",
  sintomas: "Sintomas",
  sinais_vitais: "Sinais vitais",
  atividade: "Atividade",
  nutricao: "Nutrição e hábitos",
};

function initialExpandedForSelection(selectedIds: string[]): Record<WidgetCategory, boolean> {
  const withSel = new Set<WidgetCategory>();
  for (const id of selectedIds) {
    const w = RESUMO_WIDGET_CATALOG.find((x) => x.id === id);
    if (w) withSel.add(w.category);
  }
  const out: Record<WidgetCategory, boolean> = {
    exames: withSel.has("exames"),
    sintomas: withSel.has("sintomas"),
    sinais_vitais: withSel.has("sinais_vitais"),
    atividade: withSel.has("atividade"),
    nutricao: withSel.has("nutricao"),
  };
  if (withSel.size === 0) out.exames = true;
  return out;
}

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
  const [expandedByCat, setExpandedByCat] = useState<Record<WidgetCategory, boolean>>(() =>
    initialExpandedForSelection([])
  );

  useEffect(() => {
    if (visible) setLocal(selectedIds);
  }, [visible, selectedIds]);

  useEffect(() => {
    if (visible) setExpandedByCat(initialExpandedForSelection(selectedIds));
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

  function toggleCategory(cat: WidgetCategory) {
    setExpandedByCat((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  return (
    <BottomSheetModal visible={visible} onClose={onClose} maxHeightFraction={0.88}>
      <View
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
            Escolha o que aparece no resumo. Você pode misturar exames, sintomas, vitais e hábitos. Toque na categoria para
            expandir ou recolher.
          </Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
          {RESUMO_WIDGET_CATEGORY_ORDER.map((cat) => {
            const items = byCat.get(cat);
            if (!items?.length) return null;
            const expanded = expandedByCat[cat];
            const selectedInCat = items.filter((w) => local.includes(w.id)).length;
            return (
              <View key={cat} style={{ marginBottom: theme.spacing.lg }}>
                <Pressable
                  onPress={() => toggleCategory(cat)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: expanded ? theme.spacing.sm : 0,
                  }}
                >
                  <Text style={[theme.typography.headline, { color: theme.colors.text.primary, flex: 1 }]}>
                    {CATEGORY_LABEL[cat]}
                    {selectedInCat > 0 ? (
                      <Text style={{ color: theme.colors.text.tertiary, fontWeight: "400" }}>
                        {" "}
                        ({selectedInCat})
                      </Text>
                    ) : null}
                  </Text>
                  <FontAwesome
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={theme.colors.text.secondary}
                    style={{ marginLeft: theme.spacing.sm }}
                  />
                </Pressable>
                {expanded
                  ? items.map((w) => {
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
                          <Text style={[theme.typography.body, { color: theme.colors.text.primary, flex: 1 }]}>
                            {w.label}
                          </Text>
                        </Pressable>
                      );
                    })
                  : null}
              </View>
            );
          })}
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
      </View>
    </BottomSheetModal>
  );
}
