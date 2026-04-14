const path = require("path");

/**
 * Carrega env na ordem: mobile/.env → raiz do repo → backend/.env
 * (backend já define SUPABASE_URL / SUPABASE_ANON_KEY para o mesmo projeto.)
 */
function loadEnv() {
  try {
    require("dotenv").config({ path: path.join(__dirname, ".env") });
  } catch (_) {}
  try {
    require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
  } catch (_) {}
  try {
    require("dotenv").config({ path: path.join(__dirname, "..", "backend", ".env") });
  } catch (_) {}
}

loadEnv();

module.exports = ({ config }) => {
  const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    "";
  const supabaseAnonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    "";
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim() || "";

  const plugins = Array.isArray(config.plugins) ? [...config.plugins] : [];
  if (!plugins.some((p) => p === "@react-native-community/datetimepicker" || (Array.isArray(p) && p[0] === "@react-native-community/datetimepicker"))) {
    plugins.push("@react-native-community/datetimepicker");
  }
  if (!plugins.some((p) => p === "expo-apple-authentication" || (Array.isArray(p) && p[0] === "expo-apple-authentication"))) {
    plugins.push("expo-apple-authentication");
  }
  if (!plugins.some((p) => p === "expo-secure-store" || (Array.isArray(p) && p[0] === "expo-secure-store"))) {
    plugins.push("expo-secure-store");
  }

  return {
    ...config,
    plugins,
    extra: {
      ...(config.extra ?? {}),
      supabaseUrl,
      supabaseAnonKey,
      apiUrl,
    },
  };
};
