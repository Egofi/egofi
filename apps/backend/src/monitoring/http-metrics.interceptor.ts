import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { type Observable, tap } from "rxjs";
import type { MetricsService } from "./metrics.service";

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.record(ctx, req, start),
        error: () => this.record(ctx, req, start),
      }),
    );
  }

  private record(ctx: ExecutionContext, req: FastifyRequest, startMs: number): void {
    const res = ctx.switchToHttp().getResponse<FastifyReply>();
    const duration = Date.now() - startMs;

    // Normalise dynamic route segments: /pay/abc123 → /pay/:id
    const route = req.routerPath ?? req.url.replace(/\/[a-z0-9_-]{20,}/gi, "/:id");

    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };

    this.metrics.httpRequestsTotal.inc(labels);
    this.metrics.httpRequestDurationMs.observe(labels, duration);
  }
}
