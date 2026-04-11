import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  colorLeft: string;
  colorRight: string;
  colorBg: string;
  size?: number;
};

export function PillPreview({ colorLeft, colorRight, colorBg, size = 120 }: Props) {
  const pillW = size * 0.52;
  const pillH = size * 0.2;
  const r = pillH / 2;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colorBg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <LinearGradient
        colors={[colorLeft, colorRight]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{
          width: pillW,
          height: pillH,
          borderRadius: r,
        }}
      />
    </View>
  );
}
