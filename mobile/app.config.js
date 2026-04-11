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

  return {
    ...config,
    extra: {
      ...(config.extra ?? {}),
      supabaseUrl,
      supabaseAnonKey,
      apiUrl,
    },
  };
};
