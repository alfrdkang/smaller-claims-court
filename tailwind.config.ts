import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        oak: {
          50: "#faf6f0",
          100: "#f2e8d9",
          200: "#e3cfb0",
          300: "#cfae82",
          400: "#b98a58",
          500: "#a5713f",
          600: "#8a5834",
          700: "#6f442d",
          800: "#4a2c1e",
          900: "#2e1b13",
          950: "#1a0f0a",
        },
        brass: {
          100: "#faf2da",
          200: "#f0dfae",
          300: "#e3c878",
          400: "#d4ab45",
          500: "#c08f2a",
          600: "#9c6f20",
          700: "#7a5518",
        },
        parchment: "#f6efe2",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        script: ["var(--font-script)", "cursive"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        "gavel-slam": {
          "0%": { transform: "rotate(-38deg) translateY(-14px)", opacity: "0" },
          "55%": { transform: "rotate(12deg) translateY(6px)", opacity: "1" },
          "70%": { transform: "rotate(-6deg) translateY(0)" },
          "100%": { transform: "rotate(0deg) translateY(0)", opacity: "1" },
        },
        "seal-in": {
          "0%": { transform: "scale(2.4) rotate(-18deg)", opacity: "0" },
          "60%": { transform: "scale(0.94) rotate(-12deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(-12deg)", opacity: "1" },
        },
        "fade-up": {
          "0%": { transform: "translateY(14px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        flicker: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "0.85" },
        },
      },
      animation: {
        "gavel-slam": "gavel-slam 700ms cubic-bezier(.2,.9,.3,1.4) both",
        "seal-in": "seal-in 600ms cubic-bezier(.2,.9,.3,1.3) both",
        "fade-up": "fade-up 500ms ease-out both",
        flicker: "flicker 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
