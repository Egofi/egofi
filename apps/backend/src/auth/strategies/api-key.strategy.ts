import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-custom";
import type { FastifyRequest } from "fastify";
import { AuthService } from "../auth.service";

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, "api-key") {
  constructor(private readonly auth: AuthService) {
    super();
  }

  async validate(req: FastifyRequest) {
    const rawKey = req.headers["x-api-key"];
    if (!rawKey || typeof rawKey !== "string") {
      throw new UnauthorizedException("Missing API key");
    }
    const merchant = await this.auth.validateApiKey(rawKey);
    if (!merchant) throw new UnauthorizedException("Invalid API key");
    return merchant;
  }
}
