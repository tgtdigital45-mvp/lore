import { Pressable, Text, View } from "react-native";
import { MEDICATION_SHAPES } from "@/src/medications/constants";
import { ShapeIcon } from "@/src/medications/components/ShapeIcon";
import type { MedicationShapeId } from "@/src/medications/types";
import { useAppTheme } from "@/src/hooks/useAppTheme";

type Props = {
  selectedId: MedicationShapeId | null;
  onSelect: (id: MedicationShapeId) => void;
  cellSize: number;
};

export function ShapeGrid({ selectedId, onSelect, cellSize }: Props) {
  const { theme } = useAppTheme();
  const common = MEDICATION_SHAPES.filter((s) => s.section === "common");
  const more = MEDICATION_SHAPES.filter((s) => s.section === "more");

  return (
    <View>
      <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>
        Escolha a forma
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md, justifyContent: "space-between" }}>
        {common.map((s) => (
          <Pressable key={s.id} onPress={() => onSelect(s.id)} style={{ marginBottom: theme.spacing.sm }}>
            <ShapeIcon shapeId={s.id} size={cellSize} selected={selectedId === s.id} />
          </Pressable>
        ))}
      </View>
      <Text
        style={[
          theme.typography.title2,
          { color: theme.colors.text.primary, marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
        ]}
      >
        Mais
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.md, justifyContent: "space-between" }}>
        {more.map((s) => (
          <Pressable key={s.id} onPress={() => onSelect(s.id)} style={{ marginBottom: theme.spacing.sm }}>
            <ShapeIcon shapeId={s.id} size={cellSize} selected={selectedId === s.id} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
