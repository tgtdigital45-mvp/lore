import { Pressable, Text, View } from "react-native";
import { useAppTheme } from "@/src/hooks/useAppTheme";

type Props = {
  title: string;
  colors: readonly string[];
  selected: string;
  onSelect: (hex: string) => void;
  swatchSize?: number;
};

export function ColorPalette({ title, colors, selected, onSelect, swatchSize = 36 }: Props) {
  const { theme } = useAppTheme();
  const gap = theme.spacing.sm;

  return (
    <View style={{ marginBottom: theme.spacing.lg }}>
      <Text style={[theme.typography.headline, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>
        {title}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
        {colors.map((c) => {
          const isSel = selected.toUpperCase() === c.toUpperCase();
          return (
            <Pressable
              key={c}
              onPress={() => onSelect(c)}
              style={{
                width: swatchSize + (isSel ? 6 : 0),
                height: swatchSize + (isSel ? 6 : 0),
                borderRadius: (swatchSize + (isSel ? 6 : 0)) / 2,
                borderWidth: isSel ? 3 : c === "#FFFFFF" ? 1 : 0,
                borderColor: isSel ? theme.colors.border.divider : "#C6C6C8",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: swatchSize,
                  height: swatchSize,
                  borderRadius: swatchSize / 2,
                  backgroundColor: c,
                  borderWidth: c === "#FFFFFF" ? 1 : 0,
                  borderColor: "#C6C6C8",
                }}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
