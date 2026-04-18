import { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/src/hooks/useAppTheme";
import { appStorage } from "@/src/lib/appStorage";
import { DEVICE_INTRO_SEEN_KEY } from "@/src/lib/deviceOnboardingFlags";

const SLIDES = [
  {
    id: "1",
    title: "Resumo",
    body: "Veja tratamento, próximas sessões e atalhos para o que importa no dia a dia.",
  },
  {
    id: "2",
    title: "Sintomas",
    body: "Registe sintomas em passos rápidos; a equipa vê tendências conforme as regras do hospital.",
  },
  {
    id: "3",
    title: "Privacidade",
    body: "Os dados respeitam consentimentos e a ligação ao hospital que escolher.",
  },
] as const;

const { width: SCREEN_W } = Dimensions.get("window");

export default function IntroScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const listRef = useRef<FlatList<(typeof SLIDES)[number]>>(null);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / SCREEN_W);
    setPage(i);
  }, []);

  const finish = useCallback(async () => {
    await appStorage.setItem(DEVICE_INTRO_SEEN_KEY, "1");
    router.replace("/brand-splash");
  }, [router]);

  const goNext = useCallback(() => {
    if (page < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: page + 1, animated: true });
    } else {
      void finish();
    }
  }, [page, finish]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.primary, paddingTop: insets.top }}>
      <View style={{ alignItems: "center", paddingVertical: theme.spacing.lg }}>
        <Image source={require("../assets/images/logo-A.png")} style={{ width: 88, height: 88 }} resizeMode="contain" />
        <Text style={[theme.typography.title2, { color: theme.colors.text.primary, marginTop: theme.spacing.sm }]}>
          Aura Onco
        </Text>
      </View>

      <FlatList
        ref={listRef}
        data={[...SLIDES]}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: SCREEN_W, offset: SCREEN_W * index, index })}
        onMomentumScrollEnd={onScroll}
        onScrollToIndexFailed={({ index }) => {
          setTimeout(() => listRef.current?.scrollToIndex({ index, animated: false }), 100);
        }}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_W, paddingHorizontal: theme.spacing.xl, justifyContent: "center", minHeight: 280 }}>
            <Text style={[theme.typography.largeTitle, { color: theme.colors.text.primary }]}>{item.title}</Text>
            <Text style={[theme.typography.body, { color: theme.colors.text.secondary, marginTop: theme.spacing.md, lineHeight: 22 }]}>
              {item.body}
            </Text>
          </View>
        )}
      />

      <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: theme.spacing.md }}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i === page ? theme.colors.semantic.treatment : theme.colors.border.divider,
            }}
          />
        ))}
      </View>

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: insets.bottom + theme.spacing.lg }}>
        <Pressable
          onPress={goNext}
          accessibilityRole="button"
          accessibilityLabel={page < SLIDES.length - 1 ? "Seguinte" : "Continuar"}
          style={{
            backgroundColor: theme.colors.semantic.treatment,
            paddingVertical: theme.spacing.md,
            borderRadius: theme.radius.md,
            alignItems: "center",
          }}
        >
          <Text style={[theme.typography.headline, { color: "#FFFFFF" }]}>
            {page < SLIDES.length - 1 ? "Seguinte" : "Continuar"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
