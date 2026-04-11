import { View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

type RingProps = {
  color: string;
  trackColor: string;
  progress: number;
  size: number;
  strokeWidth: number;
};

function Ring({ color, trackColor, progress, size, strokeWidth }: RingProps) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, progress)) * c;
  const half = size / 2;
  return (
    <Svg width={size} height={size}>
      <G rotation="-90" origin={`${half}, ${half}`}>
        <Circle cx={half} cy={half} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={half}
          cy={half}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
}

type Props = {
  overlap?: number;
  trackColor: string;
};

/** Decoração inspirada nos anéis do Apple Watch — apenas visual (Fase 2 trará dados reais). */
export function ActivityRingsDecoration({ overlap = 18, trackColor }: Props) {
  const s = 58;
  const sw = 7;
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Ring color="#FF2D55" trackColor={trackColor} progress={0.78} size={s} strokeWidth={sw} />
      <View style={{ marginLeft: -overlap }}>
        <Ring color="#34C759" trackColor={trackColor} progress={0.52} size={s} strokeWidth={sw} />
      </View>
      <View style={{ marginLeft: -overlap }}>
        <Ring color="#32ADE6" trackColor={trackColor} progress={0.91} size={s} strokeWidth={sw} />
      </View>
    </View>
  );
}
