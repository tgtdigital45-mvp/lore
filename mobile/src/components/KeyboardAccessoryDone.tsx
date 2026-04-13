import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { IOS_HEALTH } from "@/src/health/iosHealthTokens";

/** iOS: barra acima do teclado; use o mesmo `inputAccessoryViewID` em cada TextInput. */
export const KEYBOARD_ACCESSORY_ID = "aura-keyboard-accessory";

/** @deprecated Use KEYBOARD_ACCESSORY_ID instead */
export const KEYBOARD_DONE_ACCESSORY_ID = KEYBOARD_ACCESSORY_ID;

type Props = {
  label?: string;
  /** Chamado antes de fechar o teclado (ex.: submeter se válido). */
  onPress?: () => void;
};

/**
 * iOS: barra acima do teclado com botão para fechar (útil em number-pad / decimal-pad).
 * Android: não renderiza nada; use Keyboard.dismiss nos botões.
 */
export function KeyboardAccessoryDone({ label = "Concluído", onPress }: Props) {
  if (Platform.OS !== "ios") return null;
  return (
    <InputAccessoryView nativeID={KEYBOARD_ACCESSORY_ID}>
      <View style={styles.bar}>
        <View style={{ flex: 1 }} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={() => {
            onPress?.();
            Keyboard.dismiss();
          }}
          hitSlop={12}
          style={styles.btn}
        >
          <Text style={styles.btnText}>{label}</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

/** @deprecated Use KeyboardAccessoryDone instead */
export const KeyboardDoneAccessory = KeyboardAccessoryDone;

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#E5E5EA",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#C6C6C8",
  },
  btn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  btnText: {
    fontSize: 17,
    fontWeight: "600",
    color: IOS_HEALTH.blue,
  },
});
