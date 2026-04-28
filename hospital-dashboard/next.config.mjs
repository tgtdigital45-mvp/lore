import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Ensure `.env*` are applied before reading NEXT_PUBLIC_* (same folder as this file — robust when cwd differs). */
loadEnvConfig(__dirname, process.env.NODE_ENV !== "production");

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";

/**
 * Deprecated `domains` still participates in `hasRemoteMatch` via exact hostname equality —
 * fixes next/image when avatar URLs use the Supabase project host and wildcard matching fails to apply.
 */
function supabaseImageDomains() {
  if (!supabaseUrl) return [];
  try {
    const host = new URL(supabaseUrl).hostname;
    return host ? [host] : [];
  } catch {
    return [];
  }
}

/** Allow next/image for Supabase Storage — `*` matches project.supabase.co; pathname `/storage/**` covers public & signed paths. */
function supabaseImageRemotePatterns() {
  const patterns = [
    {
      protocol: "https",
      hostname: "*.supabase.co",
      pathname: "/storage/**",
    },
  ];
  if (!supabaseUrl) return patterns;
  try {
    const host = new URL(supabaseUrl).hostname;
    if (host && !patterns.some((p) => "hostname" in p && p.hostname === host)) {
      patterns.push({
        protocol: "https",
        hostname: host,
        pathname: "/storage/**",
      });
    }
  } catch {
    /* invalid Supabase URL */
  }
  return patterns;
}

/**
 * CSP e headers de segurança vivem aqui (e não só em vercel.json) para qualquer
 * deploy do Next servir a mesma política — evita o painel/deploy ignorar vercel.json
 * se o Root Directory estiver errado. Remova regras duplicadas de CSP no projeto Vercel.
 */
const isDev = process.env.NODE_ENV === "development";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  [
    "script-src 'self' 'unsafe-inline'",
    isDev ? "'unsafe-eval'" : "",
    "https://vercel.live https://*.vercel.live https://va.vercel-scripts.com",
  ]
    .filter(Boolean)
    .join(" "),
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
  images: {
    domains: supabaseImageDomains(),
    remotePatterns: supabaseImageRemotePatterns(),
  },
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
