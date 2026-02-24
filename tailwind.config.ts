import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core surfaces
        arbiter: {
          bg: "#0A0A0F",
          surface: "#13131A",
          elevated: "#1C1C26",
          border: "#2A2A3C",
          "border-subtle": "rgba(255, 255, 255, 0.06)",
        },
        // Brand
        indigo: {
          DEFAULT: "#6366F1",
          50: "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
          800: "#3730A3",
          900: "#312E81",
          950: "#1E1B4B",
        },
        // Semantic
        profit: {
          DEFAULT: "#10B981",
          dim: "rgba(16, 185, 129, 0.15)",
          glow: "rgba(16, 185, 129, 0.4)",
        },
        loss: {
          DEFAULT: "#F43F5E",
          dim: "rgba(244, 63, 94, 0.15)",
          glow: "rgba(244, 63, 94, 0.4)",
        },
        // Text
        text: {
          primary: "#F8FAFC",
          secondary: "#94A3B8",
          tertiary: "#64748B",
          muted: "#475569",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.8125rem", { lineHeight: "1.25rem" }],
        base: ["0.875rem", { lineHeight: "1.375rem" }],
        lg: ["1rem", { lineHeight: "1.5rem" }],
        xl: ["1.125rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.25rem", { lineHeight: "1.875rem" }],
        "3xl": ["1.5rem", { lineHeight: "2rem" }],
        "4xl": ["2rem", { lineHeight: "2.5rem" }],
        "5xl": ["2.5rem", { lineHeight: "3rem" }],
      },
      spacing: {
        "4.5": "1.125rem",
        "13": "3.25rem",
        "15": "3.75rem",
        "18": "4.5rem",
        "88": "22rem",
        "sidebar": "16rem",
        "sidebar-collapsed": "4.5rem",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      backdropBlur: {
        "2xl": "40px",
        "3xl": "64px",
      },
      boxShadow: {
        glow: "0 0 20px rgba(99, 102, 241, 0.15)",
        "glow-lg": "0 0 40px rgba(99, 102, 241, 0.2)",
        "glow-profit": "0 0 20px rgba(16, 185, 129, 0.2)",
        "glow-loss": "0 0 20px rgba(244, 63, 94, 0.2)",
        card: "0 4px 24px rgba(0, 0, 0, 0.4)",
        "card-hover": "0 8px 40px rgba(0, 0, 0, 0.6)",
      },
      animation: {
        "flash-green": "flashGreen 0.6s ease-out",
        "flash-red": "flashRed 0.6s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-in-right": "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-up": "slideInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fadeIn 0.2s ease-out",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        flashGreen: {
          "0%": { backgroundColor: "rgba(16, 185, 129, 0.3)" },
          "100%": { backgroundColor: "transparent" },
        },
        flashRed: {
          "0%": { backgroundColor: "rgba(244, 63, 94, 0.3)" },
          "100%": { backgroundColor: "transparent" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        slideInUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        ".glass": {
          background: "rgba(19, 19, 26, 0.8)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
        },
        ".glass-elevated": {
          background: "rgba(28, 28, 38, 0.85)",
          backdropFilter: "blur(40px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        },
        ".glass-indigo": {
          background: "rgba(99, 102, 241, 0.08)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(99, 102, 241, 0.15)",
        },
        ".price-tile": {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "0.75rem",
          padding: "0.5rem 1rem",
          fontWeight: "600",
          fontVariantNumeric: "tabular-nums",
          transition: "all 150ms cubic-bezier(0.16, 1, 0.3, 1)",
        },
        ".price-tile-yes": {
          background: "rgba(16, 185, 129, 0.12)",
          color: "#10B981",
          border: "1px solid rgba(16, 185, 129, 0.2)",
        },
        ".price-tile-no": {
          background: "rgba(244, 63, 94, 0.12)",
          color: "#F43F5E",
          border: "1px solid rgba(244, 63, 94, 0.2)",
        },
        ".tabular-nums": {
          fontVariantNumeric: "tabular-nums",
        },
        ".text-gradient": {
          backgroundImage: "linear-gradient(135deg, #6366F1, #818CF8)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        },
      });
    }),
  ],
};
export default config;
