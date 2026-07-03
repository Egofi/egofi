import { type ExecutionContext, createParamDecorator } from "@nestjs/common";
import type { Merchant } from "@prisma/client";
import type { FastifyRequest } from "fastify";

export const CurrentMerchant = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  // Passport attaches the authenticated principal to the request; Fastify's
  // types don't know about it.
  const req = ctx.switchToHttp().getRequest<FastifyRequest & { user?: Merchant }>();
  return req.user;
});
