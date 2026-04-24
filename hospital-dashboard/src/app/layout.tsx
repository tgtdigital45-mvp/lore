import type { Metadata } from "next";
import { Inter } from "next/font/google";

/** Toda a UI depende de cliente Supabase + auth; evita SSG a falhar sem env em CI. */
export const dynamic = "force-dynamic";
import "@/index.css";
import "@/App.css";
import { Providers } from "./Providers";

/**
 * Inter via next/font/google — subconjunto automático, hospedado localmente pelo Next.js,
 * sem solicitações à rede do Google, zero layout shift.
 */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "OncoCare — Hospital",
  description: "Triagem e prontuário oncológico (Aura)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
