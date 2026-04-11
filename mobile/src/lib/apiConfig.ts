import Constants from "expo-constants";

/**
 * URL base do backend para fetch (OCR, exames, agente).
 * Ordem: `expo.extra.apiUrl` (app.config.js + .env no build) → `EXPO_PUBLIC_API_URL` → fallback local.
 * Em telemóvel na mesma rede: use o IP do PC (ex.: http://192.168.1.10:3000), não `localhost`.
 */
export function getApiBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  const fromExtra = typeof extra?.apiUrl === "string" ? extra.apiUrl.trim() : "";
  const fromEnv =
    typeof process.env.EXPO_PUBLIC_API_URL === "string" ? process.env.EXPO_PUBLIC_API_URL.trim() : "";
  const base = fromExtra || fromEnv || "http://localhost:3000";
  return base.replace(/\/$/, "");
}
