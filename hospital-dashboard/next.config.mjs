import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * CSP e headers de segurança vivem aqui (e não só em vercel.json) para qualquer
 * deploy do Next servir a mesma política — evita o painel/deploy ignorar vercel.json
 * se o Root Directory estiver errado. Remova regras duplicadas de CSP no projeto Vercel.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://vercel.live https://*.vercel.live https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  [
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "https://vercel.live https://*.vercel.live wss://vercel.live wss://*.vercel.live",
    "https://va.vercel-scripts.com https://*.vercel.com https: wss:",
  ].join(" "),
  "frame-src 'self' https://vercel.live https://*.vercel.live",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
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
