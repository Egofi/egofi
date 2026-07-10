// Minimal typescript-eslint overlay (§3.5 [DECISION]): Biome 1.9 has no
// type-aware promise-safety rules, and unhandled async is how payment code
// loses money. This config exists for exactly two rules — do not grow it.
import tseslint from "typescript-eslint";

export default tseslint.config({
  files: ["src/**/*.ts"],
  // tsconfig excludes specs, so the type-aware parser cannot load them; without
  // this every spec file is a parse error. These rules guard production async
  // paths anyway.
  ignores: ["src/**/*.spec.ts"],
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
  plugins: { "@typescript-eslint": tseslint.plugin },
  rules: {
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",
  },
});
