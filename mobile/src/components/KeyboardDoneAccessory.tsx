import { InputAccessoryView, Keyboard, Platform, Pressable, StyleSheet, Text, View } from "react-native";

/** Partilhado por vários TextInput no mesmo tela (iOS). */
export const KEYBOARD_DONE_ACCESSORY_ID = "aura_keyboard_done";

/**
 * iOS: barra acima do teclado com «Concluído» para fechar (útil em number-pad / decimal-pad).
 * Android: não renderiza nada; use Keyboard.dismiss nos botões.
 */
export function KeyboardDoneAccessory() {
  if (Platform.OS !== "ios") return null;
  return (
    <InputAccessoryView nativeID={KEYBOARD_DONE_ACCESSORY_ID}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar teclado" onPress={() => Keyboard.dismiss()} style={styles.btn}>
          <Text style={styles.btnText}>Concluído</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: "#E5E5EA",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#C7C7CC",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  btn: { paddingVertical: 6, paddingHorizontal: 10 },
  btnText: { fontSize: 17, fontWeight: "600", color: "#007AFF" },
});
