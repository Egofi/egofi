import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";
import type { Observable } from "rxjs";

export const CORRELATION_HEADER = "x-correlation-id";

/**
 * Propagates a correlation id end-to-end (§1 observability): incoming header
 * is honored (checkout → API → jobs), otherwise one is generated. Echoed on
 * the response and attached to the request for logging and the problem+json
 * filter.
 */
@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();

    const incoming = request.headers[CORRELATION_HEADER];
    const correlationId =
      (Array.isArray(incoming) ? incoming[0] : incoming) ?? randomUUID();

    (request as FastifyRequest & { correlationId: string }).correlationId =
      correlationId;
    void reply.header(CORRELATION_HEADER, correlationId);

    return next.handle();
  }
}
