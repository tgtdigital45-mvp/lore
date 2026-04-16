import Toast from "react-native-toast-message";

/** Toast não bloqueante (substitui `Alert` em erros leves / rede). */
export function showAppToast(
  kind: "success" | "error" | "info",
  title: string,
  message?: string
): void {
  Toast.show({
    type: kind === "error" ? "error" : kind === "success" ? "success" : "info",
    text1: title,
    text2: message,
    position: "bottom",
    visibilityTime: message ? 4500 : 3200,
  });
}
