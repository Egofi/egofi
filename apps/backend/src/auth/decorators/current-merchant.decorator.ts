import { type ExecutionContext, createParamDecorator } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import type { AuthenticatedMerchant } from "../principals";

export const CurrentMerchant = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<FastifyRequest & { user?: AuthenticatedMerchant }>();
  return req.user;
});
