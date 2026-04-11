import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

type RingSpec = {
  radius: number;
  strokeWidth: number;
  progress: number;
  color: string;
};

function RingTrack({
  cx,
  cy,
  radius,
  strokeWidth,
  progress,
  color,
  trackColor,
}: {
  cx: number;
  cy: number;
  radius: number;
  strokeWidth: number;
  progress: number;
  color: string;
  trackColor: string;
}) {
  const c = 2 * Math.PI * radius;
  const p = Math.min(1, Math.max(0, progress));
  const dash = p * c;
  return (
    <>
      <Circle cx={cx} cy={cy} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
      <Circle
        cx={cx}
        cy={cy}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${dash} ${c}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    </>
  );
}

type Props = {
  size: number;
  ring: RingSpec;
  trackColor: string;
};

export function TreatmentActivityRings({ size, ring, trackColor }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <RingTrack
          cx={cx}
          cy={cy}
          radius={ring.radius}
          strokeWidth={ring.strokeWidth}
          progress={ring.progress}
          color={ring.color}
          trackColor={trackColor}
        />
      </Svg>
    </View>
  );
}
