import { View } from "react-native";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";
import type { MedicationShapeId } from "@/src/medications/types";

import { LinearGradient } from "expo-linear-gradient";

type Props = { shapeId: MedicationShapeId; size: number; selected?: boolean };

export function ShapeIcon({ shapeId, size, selected }: Props) {
  const disk = size;
  const inner = size * 0.62;
  const blue = IOS_HEALTH.blue;
  const ring = selected ? 3 : 0;
  const ringColor = "#FFFFFF";

  return (
    <View
      style={{
        width: disk + ring * 2,
        height: disk + ring * 2,
        borderRadius: (disk + ring * 2) / 2,
        borderWidth: ring,
        borderColor: ring ? ringColor : "transparent",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: ring ? "rgba(0,122,255,0.2)" : "transparent",
      }}
    >
      <View
        style={{
          width: disk,
          height: disk,
          borderRadius: disk / 2,
          backgroundColor: blue,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ width: inner, height: inner * 0.9, alignItems: "center", justifyContent: "center" }}>
          <ShapeGlyph shapeId={shapeId} size={inner * 0.85} />
        </View>
      </View>
    </View>
  );
}

export function ShapeGlyph({ shapeId, size, colors }: { shapeId: MedicationShapeId; size: number; colors?: [string, string] }) {
  const w = size;
  const h = size * 0.85;
  const white = "#FFFFFF";
  
  const ColoredFill = ({ style, ...rest }: any) => {
    if (colors) {
      return <LinearGradient colors={colors} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={style} {...rest} />;
    }
    return <View style={[{ backgroundColor: white }, style]} {...rest} />;
  };

  const dash = (top: number) => (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: w * 0.12,
        right: w * 0.12,
        top,
        height: 2,
        backgroundColor: "rgba(255,255,255,0.5)",
      }}
    />
  );

  switch (shapeId) {
    case "capsule_h":
      return (
        <View style={{ alignItems: "center", justifyContent: "center" }}>
          <ColoredFill
            style={{
              width: w,
              height: h * 0.42,
              borderRadius: h * 0.21,
              opacity: 0.95,
            }}
          />
          {dash(h * 0.21 - 1)}
        </View>
      );
    case "tablet_round":
      return (
        <View style={{ alignItems: "center", justifyContent: "center" }}>
          <ColoredFill
            style={{
              width: w * 0.72,
              height: w * 0.72,
              borderRadius: w * 0.36,
              opacity: 0.95,
            }}
          />
          {dash(w * 0.36 - 1)}
        </View>
      );
    case "tablet_oval":
      return (
        <View style={{ alignItems: "center" }}>
          <ColoredFill
            style={{
              width: w * 0.92,
              height: h * 0.38,
              borderRadius: h * 0.19,
              opacity: 0.95,
            }}
          />
          {dash(h * 0.19 - 1)}
        </View>
      );
    case "tablet_oblong":
      return (
        <View style={{ alignItems: "center" }}>
          <ColoredFill
            style={{
              width: w,
              height: h * 0.32,
              borderRadius: h * 0.08,
              opacity: 0.95,
            }}
          />
          {dash(h * 0.16 - 1)}
        </View>
      );
    case "liquid_bottle":
      return (
        <View style={{ alignItems: "center" }}>
          <View style={{ width: w * 0.35, height: h * 0.12, borderRadius: 2, backgroundColor: colors ? colors[0] : white }} />
          <ColoredFill
            style={{
              width: w * 0.55,
              height: h * 0.55,
              borderTopLeftRadius: 4,
              borderTopRightRadius: 4,
              borderBottomLeftRadius: 8,
              borderBottomRightRadius: 8,
              opacity: 0.95,
            }}
          />
        </View>
      );
    case "pill_bottle":
      return (
        <View style={{ alignItems: "center" }}>
          <View style={{ width: w * 0.45, height: h * 0.1, backgroundColor: colors ? colors[0] : white, borderRadius: 2 }} />
          <ColoredFill
            style={{
              width: w * 0.62,
              height: h * 0.52,
              borderRadius: 6,
              opacity: 0.95,
            }}
          />
        </View>
      );
    case "measuring_cup":
      return (
        <View style={{ alignItems: "center" }}>
          <View
            style={{
              width: w * 0.75,
              height: h * 0.45,
              borderBottomLeftRadius: 10,
              borderBottomRightRadius: 10,
              borderWidth: 3,
              borderColor: colors ? colors[0] : white,
              borderTopWidth: 0,
              opacity: 0.95,
            }}
          />
          <View style={{ width: w * 0.55, height: 3, backgroundColor: colors ? colors[0] : white, marginTop: -2 }} />
        </View>
      );
    case "tube":
      return (
        <View style={{ transform: [{ rotate: "-12deg" }] }}>
          <ColoredFill
            style={{
              width: w * 0.85,
              height: h * 0.35,
              borderRadius: h * 0.12,
              opacity: 0.95,
            }}
          />
        </View>
      );
    case "diamond":
      return (
        <View style={{ transform: [{ rotate: "45deg" }] }}>
          <ColoredFill style={{ width: w * 0.45, height: w * 0.45, borderRadius: 2, opacity: 0.95 }} />
        </View>
      );
    case "diamond_wide":
      return (
        <View style={{ transform: [{ rotate: "45deg" }] }}>
          <ColoredFill style={{ width: w * 0.62, height: w * 0.38, borderRadius: 2, opacity: 0.95 }} />
        </View>
      );
    case "triangle":
      return (
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: w * 0.28,
            borderRightWidth: w * 0.28,
            borderBottomWidth: w * 0.5,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderBottomColor: colors ? colors[0] : white,
            opacity: 0.95,
          }}
        />
      );
    case "kidney":
      return (
        <ColoredFill
          style={{
            width: w * 0.55,
            height: h * 0.55,
            borderRadius: w * 0.28,
            transform: [{ rotate: "-25deg" }, { scaleX: 0.85 }],
            opacity: 0.95,
          }}
        />
      );
    case "rounded_square":
      return (
        <ColoredFill
          style={{
            width: w * 0.55,
            height: w * 0.55,
            borderRadius: w * 0.12,
            opacity: 0.95,
          }}
        />
      );
    case "rounded_rect":
      return (
        <ColoredFill
          style={{
            width: w * 0.85,
            height: h * 0.38,
            borderRadius: h * 0.1,
            opacity: 0.95,
          }}
        />
      );
    case "trapezoid":
      return (
        <ColoredFill
          style={{
            width: w * 0.72,
            height: h * 0.42,
            borderTopLeftRadius: 4,
            borderTopRightRadius: 4,
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
            opacity: 0.95,
          }}
        />
      );
    case "pentagon":
      return (
        <ColoredFill
          style={{
            width: w * 0.5,
            height: h * 0.48,
            opacity: 0.95,
            transform: [{ rotate: "180deg" }],
            borderTopLeftRadius: 2,
            borderTopRightRadius: 2,
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
          }}
        />
      );
    default:
      return (
        <ColoredFill
          style={{
            width: w * 0.6,
            height: h * 0.4,
            borderRadius: h * 0.2,
            opacity: 0.95,
          }}
        />
      );
  }
}
