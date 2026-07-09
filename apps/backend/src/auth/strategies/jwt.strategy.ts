import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { MerchantStatus } from "@prisma/client";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../core/prisma.service";
import { merchantProfileSelect, toMerchantProfile } from "../../merchants/merchant.presenter";
import type { AuthenticatedMerchant } from "../principals";
import { withMerchantRole } from "../principals";

interface JwtPayload {
  sub: string;
  role: string;
}

const disabledMerchantStatuses = new Set<string>([
  MerchantStatus.SUSPENDED,
  MerchantStatus.REJECTED,
]);

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_SECRET"),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedMerchant | null> {
    if (payload.role !== "merchant") return null;
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: payload.sub },
      select: merchantProfileSelect,
    });
    if (!merchant || disabledMerchantStatuses.has(merchant.status)) return null;
    return withMerchantRole(toMerchantProfile(merchant));
  }
}
