import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, useWindowDimensions, View, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Fraction of window height for the sheet max height (default 0.92). */
  maxHeightFraction?: number;
  sheetStyle?: ViewStyle;
};

const SPRING = { damping: 22, stiffness: 320, mass: 0.85 };
const HIDE_Y = 56;

export function BottomSheetModal({ visible, onClose, children, maxHeightFraction = 0.92, sheetStyle }: Props) {
  const { height: winH } = useWindowDimensions();
  const maxH = winH * maxHeightFraction;
  const [mounted, setMounted] = useState(visible);

  const backdropO = useSharedValue(0);
  const sheetY = useSharedValue(HIDE_Y);

  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      backdropO.value = 0;
      sheetY.value = HIDE_Y;
      backdropO.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
      sheetY.value = withSpring(0, SPRING);
    } else {
      backdropO.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
      sheetY.value = withTiming(HIDE_Y, { duration: 220, easing: Easing.in(Easing.cubic) });
    }
  }, [visible, mounted]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropO.value * 0.5,
  }));

  const sheetAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  if (!mounted) return null;

  return (
    <Modal visible={mounted} animationType="none" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root} pointerEvents="box-none">
        <Animated.View
          pointerEvents="box-none"
          style={[StyleSheet.absoluteFill, styles.backdropTint, backdropStyle]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" />
        </Animated.View>
        <Animated.View style={[styles.sheetWrap, { maxHeight: maxH }, sheetAnimStyle, sheetStyle]}>{children}</Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdropTint: {
    backgroundColor: "#000000",
  },
  sheetWrap: {
    width: "100%",
  },
});
