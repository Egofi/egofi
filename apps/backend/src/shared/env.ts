import { z } from "zod";

/**
 * Strict 12-factor config (§1): every env var is validated at boot and the
 * process fails fast on anything missing or malformed. One schema, three
 * environments (local / staging / prod).
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "staging", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  ROLE: z.enum(["api", "worker", "webhook"]).default("api"),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  ADMIN_JWT_SECRET: z.string().min(16),

  TATUM_API_KEY: z.string().min(1),
  TATUM_TESTNET_API_KEY: z.string().optional(),
  TATUM_WEBHOOK_HMAC_SECRET: z.string().min(1),

  CHANGENOW_API_KEY: z.string().min(1),
  SIMPLESWAP_API_KEY: z.string().min(1),

  WEBHOOK_SIGNING_SECRET: z.string().min(1),

  // Cloudinary — stores KYB documents as private/authenticated resources.
  // Optional so the app boots without them; the KYB upload endpoint fails
  // with a clear error if a document is submitted while they're unset.
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  SENTRY_DSN: z.string().optional().or(z.literal("")),

  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  CHECKOUT_BASE_URL: z.string().url().default("http://localhost:3001"),
  MERCHANTS_BASE_URL: z.string().url().optional(),
  ADMIN_BASE_URL: z.string().url().optional(),

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
});

export type Env = z.infer<typeof envSchema>;

/** Passed to ConfigModule.forRoot({ validate }) — throws with a readable report on failure. */
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const report = parsed.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${report}`);
  }
  return parsed.data;
}
