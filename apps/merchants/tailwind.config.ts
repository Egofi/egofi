import egofiPreset from "@egofi/ui/tailwind-preset";
import type { Config } from "tailwindcss";

const config: Config = {
  presets: [egofiPreset as Config],
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  darkMode: "selector",
  theme: { extend: {} },
  plugins: [],
};

export default config;
