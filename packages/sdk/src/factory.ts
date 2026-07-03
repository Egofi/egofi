import { EgofiClient } from "./client.js";
import { MockEgofiClient } from "./mock/mock-client.js";

export type ApiMode = "mock" | "dev" | "production";

export type AnyEgofiClient = EgofiClient | MockEgofiClient;

/**
 * Creates the API client for the current mode.
 *
 * Mode is resolved (in order):
 *   1. The `mode` argument, if provided
 *   2. `NEXT_PUBLIC_API_MODE` env var
 *   3. Falls back to "dev"
 *
 * - "mock"       → MockEgofiClient (no backend required, simulated data + delays)
 * - "dev"        → EgofiClient → NEXT_PUBLIC_API_URL (default http://localhost:3000)
 * - "production" → EgofiClient → NEXT_PUBLIC_API_URL (your deployed backend URL)
 */
export function createApiClient(mode?: ApiMode): AnyEgofiClient {
  const resolved: ApiMode =
    mode ?? (process.env["NEXT_PUBLIC_API_MODE"] as ApiMode | undefined) ?? "dev";

  if (resolved === "mock") {
    if (process.env["NODE_ENV"] !== "production") {
    }
    return new MockEgofiClient();
  }

  const baseUrl =
    process.env["NEXT_PUBLIC_API_URL"] ??
    (resolved === "production" ? "" : "http://localhost:3000");

  return new EgofiClient({ baseUrl });
}
