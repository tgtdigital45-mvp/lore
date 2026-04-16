import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Dimensions, FlatList, Pressable, Text } from "react-native";
import type { AppTheme } from "@/src/theme/theme";

const ITEM_W = 52;
const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

export type MedicationCalendarStripHandle = {
  scrollTodayToCenter: () => void;
};

type Props = {
  theme: AppTheme;
  days: Date[];
  today: Date;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
};

export const MedicationCalendarStrip = forwardRef<MedicationCalendarStripHandle, Props>(
  function MedicationCalendarStrip({ theme, days, today, selectedDate, onSelectDate }, ref) {
    const listRef = useRef<FlatList<Date>>(null);
    const screenW = Dimensions.get("window").width;
    const sidePad = Math.max(0, (screenW - ITEM_W) / 2);
    const todayIdx = days.findIndex((d) => d.toDateString() === today.toDateString());

    const scrollTodayToCenter = () => {
      if (todayIdx < 0 || !listRef.current) return;
      try {
        listRef.current.scrollToIndex({ index: todayIdx, viewPosition: 0.5, animated: true });
      } catch {
        listRef.current.scrollToOffset({ offset: Math.max(0, todayIdx * ITEM_W - sidePad), animated: true });
      }
    };

    useImperativeHandle(ref, () => ({ scrollTodayToCenter }), [todayIdx, sidePad]);

    useEffect(() => {
      const id = requestAnimationFrame(() => {
        if (todayIdx < 0 || !listRef.current) return;
        try {
          listRef.current.scrollToIndex({ index: todayIdx, viewPosition: 0.5, animated: false });
        } catch {
          listRef.current.scrollToOffset({ offset: Math.max(0, todayIdx * ITEM_W - sidePad), animated: false });
        }
      });
      return () => cancelAnimationFrame(id);
    }, [todayIdx, sidePad]);

    return (
      <FlatList
        ref={listRef}
        data={days}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => `d-${i}`}
        style={{ minHeight: 80 }}
        contentContainerStyle={{
          paddingHorizontal: sidePad,
          paddingVertical: theme.spacing.sm,
          alignItems: "center",
        }}
        snapToInterval={ITEM_W}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: ITEM_W,
          offset: ITEM_W * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            listRef.current?.scrollToIndex({ index: info.index, viewPosition: 0.5, animated: false });
          }, 100);
        }}
        renderItem={({ item: d }) => {
          const isToday = d.toDateString() === today.toDateString();
          const isSelected = d.toDateString() === selectedDate.toDateString();
          return (
            <Pressable
              onPress={() => onSelectDate(d)}
              style={{
                width: ITEM_W,
                alignItems: "center",
                justifyContent: "center",
                minHeight: 64,
                paddingVertical: theme.spacing.sm,
                borderRadius: 22,
                backgroundColor: isSelected ? theme.colors.text.primary : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "500",
                  color: isSelected ? "#FFFFFF" : theme.colors.text.tertiary,
                }}
              >
                {WEEKDAYS[d.getDay()]}
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: isToday ? "700" : "500",
                  color: isSelected ? "#FFFFFF" : theme.colors.text.primary,
                  marginTop: 4,
                }}
              >
                {d.getDate()}
              </Text>
            </Pressable>
          );
        }}
      />
    );
  }
);
