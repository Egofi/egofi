import type { CreateMerchantDto } from "@egofi/types";
import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { JwtService } from "@nestjs/jwt";
import type { Prisma } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import type { PrismaService } from "../core/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async registerMerchant(dto: CreateMerchantDto & { password: string }) {
    const existing = await this.prisma.merchant.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new BadRequestException("Email already registered");

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const merchant = await this.prisma.merchant.create({
      data: {
        business: dto.business,
        email: dto.email,
        passwordHash,
        settlementAsset: dto.settlementAsset,
        settlementAddresses: dto.settlementAddresses as Prisma.InputJsonValue,
      },
    });

    const token = this.jwt.sign({ sub: merchant.id, role: "merchant" });
    return { accessToken: token, merchant };
  }

  async loginMerchant(email: string, password: string) {
    const merchant = await this.prisma.merchant.findUnique({ where: { email } });
    if (!merchant) throw new UnauthorizedException("Invalid credentials");

    const valid = await bcrypt.compare(password, merchant.passwordHash);
    if (!valid) throw new UnauthorizedException("Invalid credentials");

    if (merchant.status === "SUSPENDED") throw new UnauthorizedException("Account suspended");

    const token = this.jwt.sign({ sub: merchant.id, role: "merchant" });
    return { accessToken: token, merchant };
  }

  async validateApiKey(rawKey: string) {
    const { createHash } = await import("node:crypto");
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      include: { merchant: true },
    });
    if (!apiKey) return null;

    void this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return apiKey.merchant;
  }

  async loginAdmin(email: string, password: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { email } });
    if (!admin) throw new UnauthorizedException("Invalid credentials");

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) throw new UnauthorizedException("Invalid credentials");

    const adminSecret = this.config.getOrThrow<string>("ADMIN_JWT_SECRET");
    const token = this.jwt.sign(
      { sub: admin.id, role: admin.role },
      { secret: adminSecret, expiresIn: "8h" },
    );
    return { accessToken: token, admin };
  }
}
