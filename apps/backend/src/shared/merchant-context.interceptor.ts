import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { Observable, type Subscriber } from "rxjs";
import { merchantContextStore } from "../core/merchant-context";

interface AuthenticatedRequest extends FastifyRequest {
  user?: { id?: string; role?: string };
}

@Injectable()
export class MerchantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const merchantId = request.user?.role === "merchant" ? request.user.id : undefined;

    if (!merchantId) return next.handle();

    return new Observable((subscriber: Subscriber<unknown>) => {
      let subscription: { unsubscribe: () => void } | undefined;
      merchantContextStore.run({ merchantId }, () => {
        subscription = next.handle().subscribe(subscriber);
      });
      return () => subscription?.unsubscribe();
    });
  }
}
