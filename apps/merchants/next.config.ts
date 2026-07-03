import { join } from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin tracing to the monorepo root so Next ignores the stray lockfile in the
  // user's home directory (silences the "inferred workspace root" warning).
  // `next dev`/`build` always run from this package dir, so cwd/../.. = repo root.
  outputFileTracingRoot: join(process.cwd(), "..", ".."),
  transpilePackages: ["@egofi/ui", "@egofi/sdk", "@egofi/types"],
  env: {
    NEXT_PUBLIC_API_URL: process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3000",
    NEXT_PUBLIC_CHECKOUT_URL: process.env["NEXT_PUBLIC_CHECKOUT_URL"] ?? "http://localhost:3001",
  },
};

export default nextConfig;
