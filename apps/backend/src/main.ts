import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import fastifyMultipart from "@fastify/multipart";
import pino from "pino";
import { AppModule } from "./app.module";

const logger = pino({ level: process.env["LOG_LEVEL"] ?? "info" });

// Out-of-the-box process safety net: nothing dies silently. An unhandled
// rejection in payment code is a money-losing bug — log it loudly. Rejections
// are logged and survived (BullMQ/Fastify layers own their retries);
// uncaught exceptions mean unknown process state, so log and exit for the
// orchestrator to restart.
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "UNHANDLED PROMISE REJECTION");
});
process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "UNCAUGHT EXCEPTION — exiting");
  process.exit(1);
});

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  // Multipart uploads for KYB documents. 10 MB cap, one file per request.
  // Cast bypasses a harmless fastify 4.28/4.29 type skew across the two copies
  // pnpm keeps in the tree; the plugin is runtime-compatible.
  await app.register(fastifyMultipart as never, {
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  });

  // Graceful shutdown: lets Prisma/Redis/BullMQ close cleanly on SIGTERM so
  // in-flight jobs finish instead of dying mid-transition.
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Dev: allow any origin so the apps work from LAN IPs (http://192.168.x.x:300x).
  // Production: strict allowlist of the three deployed frontends.
  const isDev = (process.env["NODE_ENV"] ?? "development") === "development";
  app.enableCors({
    origin: isDev
      ? true
      : [
          process.env["CHECKOUT_BASE_URL"] ?? "http://localhost:3001",
          process.env["MERCHANTS_BASE_URL"] ?? "http://localhost:3002",
          process.env["ADMIN_BASE_URL"] ?? "http://localhost:3003",
        ],
    credentials: true,
  });

  const role = process.env["ROLE"] ?? "api";

  if (role === "api" || role === "webhook") {
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

  const port = Number(process.env["PORT"] ?? 3000);
  await app.listen(port, "0.0.0.0");
  logger.info({ role, port }, "Egofi backend started");
}

void bootstrap();
