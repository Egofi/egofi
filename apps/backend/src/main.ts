import fastifyMultipart from "@fastify/multipart";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import pino from "pino";
import { AppModule } from "./app.module";

const logger = pino({ level: process.env["LOG_LEVEL"] ?? "info" });

function readBooleanEnv(name: string): boolean {
  return process.env[name] === "true";
}

function readBodyLimit(): number {
  const raw = Number(process.env["JSON_BODY_LIMIT_BYTES"] ?? 262_144);
  return Number.isFinite(raw) ? raw : 262_144;
}

function configureSecurityHeaders(app: NestFastifyApplication, isDeployed: boolean): void {
  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook("onRequest", async (request, reply) => {
    void reply.header("x-content-type-options", "nosniff");
    void reply.header("x-frame-options", "DENY");
    void reply.header("referrer-policy", "no-referrer");
    void reply.header("cross-origin-resource-policy", "same-site");
    void reply.header("permissions-policy", "camera=(), microphone=(), geolocation=()");

    if (!request.url.startsWith("/docs")) {
      void reply.header("content-security-policy", "default-src 'none'; frame-ancestors 'none'");
    }
    if (isDeployed) {
      void reply.header("strict-transport-security", "max-age=15552000; includeSubDomains");
    }
  });
}

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "UNHANDLED PROMISE REJECTION");
});
process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "UNCAUGHT EXCEPTION - exiting");
  process.exit(1);
});

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: false,
      bodyLimit: readBodyLimit(),
      trustProxy: readBooleanEnv("TRUST_PROXY"),
    }),
  );
  const config = app.get(ConfigService);
  const nodeEnv = config.get<string>("NODE_ENV", "development");
  const isDev = nodeEnv === "development";
  const isDeployed = nodeEnv === "production" || nodeEnv === "staging";

  configureSecurityHeaders(app, isDeployed);

  await app.register(fastifyMultipart as never, {
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  });

  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const allowedOrigins = new Set(
    [
      config.get<string>("CHECKOUT_BASE_URL"),
      config.get<string>("MERCHANTS_BASE_URL"),
      config.get<string>("ADMIN_BASE_URL"),
    ].filter((origin): origin is string => Boolean(origin)),
  );

  app.enableCors({
    origin: isDev
      ? true
      : (origin, callback) => {
          if (!origin || allowedOrigins.has(origin)) {
            callback(null, true);
            return;
          }
          callback(new Error("Origin not allowed by CORS"), false);
        },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "authorization",
      "content-type",
      "idempotency-key",
      "x-api-key",
      "x-correlation-id",
    ],
    exposedHeaders: ["x-correlation-id", "x-idempotent-replay"],
  });

  const role = config.get<string>("ROLE", "api");

  if ((role === "api" || role === "webhook") && config.get<boolean>("ENABLE_SWAGGER", false)) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Egofi API")
      .setDescription("Non-custodial crypto payment gateway API")
      .setVersion("1.0")
      .addBearerAuth()
      .addApiKey({ type: "apiKey", in: "header", name: "x-api-key" }, "api-key")
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("docs", app, document);
  }

  const port = config.get<number>("PORT", 3000);
  await app.listen(port, "0.0.0.0");
  logger.info({ role, port }, "Egofi backend started");
}

void bootstrap();
