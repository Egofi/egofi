import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../core/prisma.service";
import type { AdminPrincipal } from "../principals";

interface AdminJwtPayload {
  sub: string;
  role: string;
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, "admin-jwt") {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("ADMIN_JWT_SECRET"),
    });
  }

  async validate(payload: AdminJwtPayload): Promise<AdminPrincipal | null> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, createdAt: true },
    });
    if (!admin || admin.role !== payload.role) return null;
    return admin;
  }
}
