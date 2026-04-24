import { View } from "react-native";
import { ShapeGlyph } from "./ShapeIcon";
import type { MedicationShapeId } from "../types";

type Props = {
  shapeId?: MedicationShapeId | null;
  colorLeft: string;
  colorRight: string;
  colorBg: string;
  size?: number;
};

export function PillPreview({ shapeId, colorLeft, colorRight, colorBg, size = 120 }: Props) {
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
      <ShapeGlyph 
        shapeId={shapeId || "capsule_h"} 
        size={size * 0.62 * 0.85} 
        colors={[colorLeft, colorRight]} 
      />
    </View>
  );
}
