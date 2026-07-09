import { type ExecutionContext, createParamDecorator } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import type { AdminPrincipal } from "../principals";

export const CurrentAdmin = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<FastifyRequest & { user?: AdminPrincipal }>();
  return req.user;
});
