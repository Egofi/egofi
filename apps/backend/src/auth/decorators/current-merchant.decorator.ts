import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import type { Merchant } from "@prisma/client";

export const CurrentMerchant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    // Passport attaches the authenticated principal to the request; Fastify's
    // types don't know about it.
    const req = ctx
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: Merchant }>();
    return req.user;
  },
);
