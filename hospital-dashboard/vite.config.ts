import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const envRoot = loadEnv(mode, path.resolve(__dirname, ".."), "");
  const envLocal = loadEnv(mode, __dirname, "");
  const supabaseUrl =
    envLocal.VITE_SUPABASE_URL || envRoot.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: "http://127.0.0.1:3001",
          changeOrigin: true,
        },
        ...(supabaseUrl
          ? {
              "/functions/v1": {
                target: supabaseUrl,
                changeOrigin: true,
                secure: true,
              },
            }
          : {}),
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-supabase": ["@supabase/supabase-js"],
          },
        },
      },
    },
  };
});
