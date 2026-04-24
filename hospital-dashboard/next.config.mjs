import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
      "@radix-ui/react-avatar",
      "@radix-ui/react-progress",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-slot",
      "@radix-ui/react-tooltip",
    ],
  },
  /** Browsers ainda pedem /favicon.ico; servimos o SVG existente em public/. */
  async redirects() {
    return [{ source: "/favicon.ico", destination: "/favicon.svg", permanent: true }];
  },
  /**
   * Next.js rewrites: encaminha `/api/*` ao onco-backend (URL via env em produção).
   */
  async rewrites() {
    const backendBase = (process.env.BACKEND_URL ?? "http://127.0.0.1:3001").replace(/\/$/, "");
    const rules = [
      {
        source: "/api/:path*",
        destination: `${backendBase}/api/:path*`,
      },
    ];
    if (supabaseUrl) {
      const base = String(supabaseUrl).replace(/\/$/, "");
      rules.push({
        source: "/functions/v1/:path*",
        destination: `${base}/functions/v1/:path*`,
      });
    }
    return rules;
  },
};

export default nextConfig;
