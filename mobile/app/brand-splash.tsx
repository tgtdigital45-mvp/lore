import { useEffect, useRef } from "react";
import { Animated, Image, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/src/hooks/useAppTheme";

const SPLASH_MS = 1000;

export default function BrandSplashScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0.3)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: SPLASH_MS * 0.6, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]);
    anim.start();
    const t = setTimeout(() => {
      router.replace("/login");
    }, SPLASH_MS);
    return () => clearTimeout(t);
  }, [opacity, scale, router]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background.primary,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <Image source={require("../assets/images/logo-A.png")} style={{ width: 120, height: 120 }} resizeMode="contain" />
      </Animated.View>
      <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginTop: theme.spacing.lg }]}>
        Aura Onco
      </Text>
    </View>
  );
}
