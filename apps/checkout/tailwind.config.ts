import type { Config } from "tailwindcss";
import egofiPreset from "@egofi/ui/tailwind-preset";

const config: Config = {
  presets: [egofiPreset as Config],
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};

export default config;
