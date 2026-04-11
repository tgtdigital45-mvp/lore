import type { ReactNode } from "react";
import { Pressable } from "react-native";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";

export function CircleChromeButton({
  onPress,
  children,
  accessibilityLabel,
}: {
  onPress: () => void;
  children: ReactNode;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: "#FFFFFF",
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.75 : 1,
          ...IOS_HEALTH.shadow.floatingControl,
        },
      ]}
    >
      {children}
    </Pressable>
  );
}
