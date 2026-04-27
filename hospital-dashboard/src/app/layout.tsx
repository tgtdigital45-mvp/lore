import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";

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

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-lora",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "OncoCare — Hospital",
  description: "Triagem e prontuário oncológico (Aura)",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${lora.variable}`} suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
