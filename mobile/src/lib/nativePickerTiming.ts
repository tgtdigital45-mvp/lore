import { Alert, Linking, Platform } from "react-native";

/**
 * Após fechar um Modal React Native, o SO precisa de tempo antes de apresentar
 * o picker nativo (galeria, documentos). Sem isto, no iOS a galeria pode não abrir.
 */
export function delayAfterModalCloseMs(): number {
  if (Platform.OS === "web") return 0;
  if (Platform.OS === "android") return 360;
  return 420;
}

export function afterModalCloseThen(
  action: () => void | Promise<void>,
  onError?: (e: unknown) => void,
  delayOverrideMs?: number
): void {
  const delayMs = delayOverrideMs ?? delayAfterModalCloseMs();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        void Promise.resolve(action()).catch((e: unknown) => {
          console.warn("[nativePicker]", e);
          if (onError) onError(e);
          else {
            Alert.alert("Erro", e instanceof Error ? e.message : "Não foi possível abrir o seletor.");
          }
        });
      }, delayMs);
    });
  });
}

export function alertPermissionToSettings(title: string, body: string): void {
  Alert.alert(title, body, [
    { text: "Cancelar", style: "cancel" },
    { text: "Abrir definições", onPress: () => void Linking.openSettings() },
  ]);
}
