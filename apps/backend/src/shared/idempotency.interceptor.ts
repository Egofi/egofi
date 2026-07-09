import { createHash } from "node:crypto";
import {
  BadRequestException,
  type CallHandler,
  ConflictException,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { FastifyReply, FastifyRequest } from "fastify";
import { type Observable, firstValueFrom, from } from "rxjs";
import { RedisService } from "../core/redis.service";

export const SKIP_IDEMPOTENCY_KEY = "egofi:skip-idempotency";
export const SkipIdempotency = () => SetMetadata(SKIP_IDEMPOTENCY_KEY, true);

const IDEMPOTENCY_HEADER = "idempotency-key";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const TTL_SECONDS = 60 * 60 * 24;
const IN_FLIGHT = "__in_flight__";

interface RequestWithPrincipal extends FastifyRequest {
  user?: { id?: string; role?: string };
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithPrincipal>();
    const reply = http.getResponse<FastifyReply>();

    if (!MUTATING_METHODS.has(request.method)) return next.handle();

    const skipped = this.reflector.getAllAndOverride<boolean>(SKIP_IDEMPOTENCY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipped) return next.handle();

    const headerValue = request.headers[IDEMPOTENCY_HEADER];
    const key = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (!key || key.length < 8 || key.length > 128) {
      throw new BadRequestException(
        "An Idempotency-Key header (8-128 chars) is required on mutating endpoints",
      );
    }

    const principal = request.user?.id
      ? `${request.user.role ?? "user"}:${request.user.id}`
      : `ip:${request.ip}`;
    const keyHash = createHash("sha256").update(key).digest("hex");
    const redisKey = `idem:${principal}:${request.method}:${request.url}:${keyHash}`;

    const claimed = await this.redis.set(redisKey, IN_FLIGHT, "EX", TTL_SECONDS, "NX");

    if (claimed !== "OK") {
      const stored = await this.redis.get(redisKey);
      if (stored === IN_FLIGHT || stored === null) {
        throw new ConflictException("A request with this Idempotency-Key is still being processed");
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
          await this.redis.del(redisKey);
          throw error;
        }
      })(),
    );
  }
}
