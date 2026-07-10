import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { ErrorThrottle, isTransportError } from "../shared/connection-error";

/** Reconnect backoff: 200ms, 400ms, … capped at 5s, instead of ioredis's 50ms floor. */
function retryStrategy(attempt: number): number {
  return Math.min(attempt * 200, 5_000);
}

@Injectable()
export class RedisService extends Redis implements OnModuleInit, OnModuleDestroy {
  // Not a parameter property: ioredis's base class already declares a
  // (public) `config` member, which a private field would illegally shadow.
  private readonly logger = new Logger(RedisService.name);
  private readonly errorThrottle = new ErrorThrottle();

  constructor(configService: ConfigService) {
    super(configService.getOrThrow<string>("REDIS_URL"), {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      retryStrategy,
    });

    // ioredis dumps the raw error to console.error whenever nothing listens on
    // "error" (see its silentEmit). During an outage that is one stack trace per
    // reconnect attempt, so attach a listener and collapse the repeats.
    this.on("error", (error: unknown) => this.reportError(error));
    this.on("ready", () => this.errorThrottle.reset());
  }

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.quit();
  }

  private reportError(error: unknown): void {
    if (!isTransportError(error)) {
      this.logger.error({ err: error }, "redis error");
      return;
    }
    const report = this.errorThrottle.next();
    if (!report) return;
    this.logger.warn(
      { code: error.code, reason: error.message, ...(report.suppressed ? report : {}) },
      "redis unreachable — retrying",
    );
  }
}
