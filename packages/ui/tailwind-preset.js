// Egofi "Gulf of Guinea" design tokens — the single source of truth for all
// three frontends. Apps consume this via `presets: [require("@egofi/ui/tailwind-preset")]`.
//
//   navy    #071C3D  ink & deep surfaces
//   primary #1D4ED8  actions (blue-700)
//   info    #0EA5E9  links & informational accents (sky-500)
//   accent  #A3E635  the lime flare — highlights, brand punctuation (lime-400)
//   success #4ADE80  confirmations (green-400)
//   danger  #FB7185  errors & destructive actions (rose-400)

const colors = require("tailwindcss/colors");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#071C3D",
          50: "#F1F5FA",
          100: "#E1E9F3",
          200: "#C3D3E7",
          300: "#93AECF",
          400: "#5B80B0",
          500: "#375D92",
          600: "#254475",
          700: "#18325C",
          800: "#0E2449",
          900: "#071C3D",
          950: "#040F26",
        },
        primary: { ...colors.blue, DEFAULT: "#1D4ED8" },
        info: { ...colors.sky, DEFAULT: "#0EA5E9" },
        accent: { ...colors.lime, DEFAULT: "#A3E635" },
        success: { ...colors.green, DEFAULT: "#4ADE80" },
        danger: { ...colors.rose, DEFAULT: "#FB7185" },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        // Tighter display sizes with baked-in line-height + tracking.
        "display-sm": ["1.75rem", { lineHeight: "2.125rem", letterSpacing: "-0.02em" }],
        "display-md": ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.025em" }],
        "display-lg": ["3rem", { lineHeight: "3.25rem", letterSpacing: "-0.03em" }],
      },
      boxShadow: {
        // Layered, navy-tinted elevation scale — soft and cool, never grey.
        xs: "0 1px 2px 0 rgb(7 28 61 / 0.04)",
        sm: "0 1px 3px 0 rgb(7 28 61 / 0.06), 0 1px 2px -1px rgb(7 28 61 / 0.05)",
        card: "0 1px 2px 0 rgb(7 28 61 / 0.04), 0 6px 20px -6px rgb(7 28 61 / 0.10)",
        "card-hover": "0 2px 4px 0 rgb(7 28 61 / 0.06), 0 14px 32px -8px rgb(7 28 61 / 0.16)",
        lg: "0 8px 32px -8px rgb(7 28 61 / 0.18)",
        xl: "0 24px 60px -16px rgb(7 28 61 / 0.28)",
        glow: "0 0 0 4px rgb(163 230 53 / 0.22)",
        "glow-primary": "0 0 0 4px rgb(29 78 216 / 0.14)",
        "inset-hairline": "inset 0 0 0 1px rgb(255 255 255 / 0.06)",
      },
      // Flat / square corners across the whole UI. Every rectangular radius
      // token collapses to 0 so `rounded`, `rounded-md`, `rounded-2xl`, etc.
      // render sharp. `full` is kept so genuine circles (avatars, status dots,
      // spinners, pill badges) stay round rather than becoming squares.
      borderRadius: {
        none: "0",
        sm: "0",
        DEFAULT: "0",
        md: "0",
        lg: "0",
        xl: "0",
        "2xl": "0",
        "3xl": "0",
        full: "9999px",
      },
      backgroundImage: {
        "brand-gradient":
          "radial-gradient(120% 120% at 0% 0%, #0E2449 0%, #071C3D 45%, #040F26 100%)",
        "brand-mesh":
          "radial-gradient(60% 50% at 15% 10%, rgba(14,165,233,0.18) 0%, transparent 60%), radial-gradient(50% 60% at 90% 20%, rgba(29,78,216,0.22) 0%, transparent 55%), radial-gradient(55% 55% at 80% 100%, rgba(163,230,53,0.10) 0%, transparent 60%)",
        "grid-navy":
          "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
        shimmer:
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.65) 50%, transparent 100%)",
      },
      keyframes: {
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.9)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.3s ease-out both",
        "scale-in": "scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "slide-in-right": "slide-in-right 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
};
