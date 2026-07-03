import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import { firstValueFrom, from, type Observable } from "rxjs";
import { RedisService } from "../core/redis.service";

export const SKIP_IDEMPOTENCY_KEY = "egofi:skip-idempotency";

/**
 * Opts a controller/handler OUT of the idempotency gate. Reserved for
 * endpoints where the requirement is wrong by design: inbound provider
 * webhooks (they carry their own (txHash, leg) dedupe and third parties
 * won't send our header) and authentication (no resource is created).
 */
export const SkipIdempotency = () => SetMetadata(SKIP_IDEMPOTENCY_KEY, true);

const IDEMPOTENCY_HEADER = "idempotency-key";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const TTL_SECONDS = 60 * 60 * 24; // replay window: 24h
const IN_FLIGHT = "__in_flight__";

/**
 * Out-of-the-box idempotency gate (§1 API design): EVERY mutating endpoint
 * requires an `Idempotency-Key` header by default — a retried request must
 * never create a second charge. This is the default, not an opt-in: new
 * endpoints are protected the moment they exist. A retry with the same key
 * replays the original response; concurrent duplicates get 409.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();

    if (!MUTATING_METHODS.has(request.method)) return next.handle();

    const skipped = this.reflector.getAllAndOverride<boolean>(
      SKIP_IDEMPOTENCY_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipped) return next.handle();

    const headerValue = request.headers[IDEMPOTENCY_HEADER];
    const key = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (!key || key.length < 8 || key.length > 128) {
      throw new BadRequestException(
        "An Idempotency-Key header (8–128 chars) is required on mutating endpoints",
      );
    }

    const redisKey = `idem:${request.method}:${request.url}:${key}`;

    // Claim the key; if already claimed, replay or reject.
    const claimed = await this.redis.set(
      redisKey,
      IN_FLIGHT,
      "EX",
      TTL_SECONDS,
      "NX",
    );

    if (claimed !== "OK") {
      const stored = await this.redis.get(redisKey);
      if (stored === IN_FLIGHT || stored === null) {
        throw new ConflictException(
          "A request with this Idempotency-Key is still being processed",
        );
      }
      const cached = JSON.parse(stored) as { status: number; body: unknown };
      void reply.status(cached.status).header("x-idempotent-replay", "true");
      return from([cached.body]);
    }

    return from(
      (async () => {
        try {
          const body = await firstValueFrom(next.handle());
          await this.redis.set(
            redisKey,
            JSON.stringify({ status: reply.statusCode ?? 200, body }),
            "EX",
            TTL_SECONDS,
          );
          return body;
        } catch (error) {
          // Failed requests release the key so the client can retry.
          await this.redis.del(redisKey);
          throw error;
        }
      })(),
    );
  }
}
