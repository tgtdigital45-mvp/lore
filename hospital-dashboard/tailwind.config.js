import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./src/app/**/*.{js,ts,jsx,tsx}", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        clinical: {
          success: "#10B981",
          attention: "#FFA500",
          critical: "#FF4D4D",
          indigo: "#4F46E5",
        },
        onco: {
          brand: "hsl(var(--onco-brand))",
          "brand-light": "hsl(var(--onco-brand-light))",
          "brand-strong": "hsl(var(--onco-brand-strong))",
          surface: "hsl(var(--onco-surface))",
          "surface-muted": "hsl(var(--onco-surface-muted))",
          "text-primary": "hsl(var(--onco-text-primary))",
          "text-secondary": "hsl(var(--onco-text-secondary))",
        },
        lime: {
          50: "#f7fee7",
          100: "#ecfccb",
          200: "#d9f99d",
          300: "#bef264",
          400: "#a3e635",
          500: "#84cc16",
          600: "#65a30d",
        },
        teal: {
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f8fafc",
          sidebar: "#f0f1f3",
          app: "#f3f4f6",
        },
      },
      boxShadow: {
        soft: "0 8px 32px -8px rgba(0,0,0,0.08), 0 2px 8px -2px rgba(0,0,0,0.04)",
        card: "0 4px 16px -4px rgba(0,0,0,0.07), 0 1px 4px -1px rgba(0,0,0,0.04)",
        modal: "0 24px 56px -16px rgba(15,23,42,0.14), 0 8px 24px -8px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
        "popover-premium": "0 12px 40px -10px rgba(15,23,42,0.12), 0 4px 12px -4px rgba(0,0,0,0.06)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "3xl": "1.5rem",
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "'Fira Code'", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        display: "var(--letter-display)",
      },
      transitionTimingFunction: {
        spring: "var(--ease-spring)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 1.35s ease-in-out infinite",
        "fade-in": "fade-in 0.35s ease-out forwards",
        "pulse-clinical": "pulse-clinical 2s ease-in-out infinite",
        "page-enter": "page-enter 0.4s var(--ease-spring) forwards",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
