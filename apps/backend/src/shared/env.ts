import { z } from "zod";

const booleanString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const secretSchema = (name: string, minLength = 32) =>
  z.string().min(minLength, `${name} must be at least ${minLength} characters`);

function isPlaceholderSecret(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("change-me") ||
    normalized.includes("changeme") ||
    normalized.startsWith("your-") ||
    normalized.includes("replace-me")
  );
}

function isLocalUrl(value: string): boolean {
  try {
    const { hostname } = new URL(value);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

/**
 * Strict 12-factor config: every env var is validated at boot and the process
 * fails fast on anything missing or malformed.
 */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    ROLE: z.enum(["api", "worker", "webhook"]).default("api"),
    TRUST_PROXY: booleanString,
    ENABLE_SWAGGER: booleanString,
    JSON_BODY_LIMIT_BYTES: z.coerce.number().int().min(16_384).max(1_048_576).default(262_144),

    // The runtime connection. Must be the unprivileged `egofi_app` role, or
    // row-level security is silently bypassed (PrismaService refuses to boot).
    DATABASE_URL: z.string().url(),
    // Owner role, used only by Prisma Migrate. App processes never open it;
    // set it equal to DATABASE_URL there if you don't want to ship owner creds.
    DIRECT_DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),

    JWT_SECRET: secretSchema("JWT_SECRET"),
    JWT_EXPIRES_IN: z.string().default("15m"),
    ADMIN_JWT_SECRET: secretSchema("ADMIN_JWT_SECRET"),

    TATUM_API_KEY: z.string().min(1),
    TATUM_TESTNET_API_KEY: z.string().optional(),
    TATUM_WEBHOOK_HMAC_SECRET: secretSchema("TATUM_WEBHOOK_HMAC_SECRET"),

    CHANGENOW_API_KEY: z.string().min(1),
    SIMPLESWAP_API_KEY: z.string().min(1),

    WEBHOOK_SIGNING_SECRET: secretSchema("WEBHOOK_SIGNING_SECRET"),
    PROVIDER_WEBHOOK_SECRET: secretSchema("PROVIDER_WEBHOOK_SECRET").optional(),
    METRICS_BEARER_TOKEN: secretSchema("METRICS_BEARER_TOKEN").optional(),

    // AES-256-GCM key for encrypting merchant IPN secrets at rest (32 bytes / 64 hex).
    FIELD_ENCRYPTION_KEY: z
      .string()
      .regex(/^[0-9a-fA-F]{64}$/, "FIELD_ENCRYPTION_KEY must be 64 hex characters (32 bytes)"),

    // Cloudinary stores KYB documents as private/authenticated resources.
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),

    SENTRY_DSN: z.string().optional().or(z.literal("")),

    APP_BASE_URL: z.string().url().default("http://localhost:3000"),
    CHECKOUT_BASE_URL: z.string().url().default("http://localhost:3001"),
    MERCHANTS_BASE_URL: z.string().url().optional(),
    ADMIN_BASE_URL: z.string().url().optional(),

    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  })
  .superRefine((config, ctx) => {
    const isDeployed = config.NODE_ENV === "production" || config.NODE_ENV === "staging";
    if (!isDeployed) return;

    const secretKeys = [
      "JWT_SECRET",
      "ADMIN_JWT_SECRET",
      "TATUM_WEBHOOK_HMAC_SECRET",
      "WEBHOOK_SIGNING_SECRET",
      "PROVIDER_WEBHOOK_SECRET",
      "METRICS_BEARER_TOKEN",
      "FIELD_ENCRYPTION_KEY",
    ] as const;

    for (const key of secretKeys) {
      const value = config[key];
      if (!value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required in ${config.NODE_ENV}`,
        });
        continue;
      }
      if (isPlaceholderSecret(value) || (key === "FIELD_ENCRYPTION_KEY" && /^0+$/.test(value))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} must not use a placeholder value in ${config.NODE_ENV}`,
        });
      }
    }

    const urlKeys = [
      "APP_BASE_URL",
      "CHECKOUT_BASE_URL",
      "MERCHANTS_BASE_URL",
      "ADMIN_BASE_URL",
    ] as const;

    for (const key of urlKeys) {
      const value = config[key];
      if (!value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required in ${config.NODE_ENV}`,
        });
        continue;
      }
      if (isLocalUrl(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} must not point at localhost in ${config.NODE_ENV}`,
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Passed to ConfigModule.forRoot({ validate }) - throws with a readable report on failure. */
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const report = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${report}`);
  }
  return parsed.data;
}
