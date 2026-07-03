import type { NextConfig } from "next";
import { join } from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: join(process.cwd(), "..", ".."),
  experimental: { typedRoutes: true },
  transpilePackages: ["@egofi/ui", "@egofi/sdk", "@egofi/types"],
  env: {
    NEXT_PUBLIC_API_URL: process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3000",
  },
};

export default nextConfig;
