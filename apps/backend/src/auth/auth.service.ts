import { createHash, randomBytes } from "node:crypto";
import type { CreateMerchantDto } from "@egofi/types";
import { BadRequestException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { MerchantStatus, type Prisma } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../core/prisma.service";
import {
  type MerchantProfileRecord,
  merchantProfileSelect,
  toMerchantProfile,
} from "../merchants/merchant.presenter";
import type { AdminPrincipal, AuthenticatedMerchant } from "./principals";
import { withMerchantRole } from "./principals";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const disabledMerchantStatuses = new Set<string>([
  MerchantStatus.SUSPENDED,
  MerchantStatus.REJECTED,
]);

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async registerMerchant(dto: CreateMerchantDto & { password: string }) {
    const existing = await this.prisma.merchant.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true },
    });
    if (existing) throw new BadRequestException("Email already registered");

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const merchant = await this.prisma.merchant.create({
      data: {
        business: dto.business.trim(),
        email: dto.email.toLowerCase(),
        passwordHash,
        settlementAsset: dto.settlementAsset,
        settlementAddresses: dto.settlementAddresses as Prisma.InputJsonValue,
      },
      select: merchantProfileSelect,
    });

    return this.issueMerchantSession(merchant);
  }

  async loginMerchant(email: string, password: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { email: email.toLowerCase() },
      select: { ...merchantProfileSelect, passwordHash: true },
    });
    if (!merchant) throw new UnauthorizedException("Invalid credentials");

    const valid = await bcrypt.compare(password, merchant.passwordHash);
    if (!valid) throw new UnauthorizedException("Invalid credentials");

    if (disabledMerchantStatuses.has(merchant.status)) {
      throw new UnauthorizedException("Account is not active");
    }

    return this.issueMerchantSession(merchant);
  }

  async refreshToken(rawRefreshToken: string) {
    const tokenHash = createHash("sha256").update(rawRefreshToken).digest("hex");
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored) throw new UnauthorizedException("Invalid refresh token");

    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { family: stored.family, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("Refresh token reuse detected; all sessions revoked");
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Refresh token expired");
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: stored.merchantId },
      select: merchantProfileSelect,
    });
    if (!merchant || disabledMerchantStatuses.has(merchant.status)) {
      await this.prisma.refreshToken.updateMany({
        where: { family: stored.family, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("Account is not active");
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokenPair = await this.issueTokenPair(stored.merchantId, stored.family);
    return { ...tokenPair, merchant: toMerchantProfile(merchant) };
  }

  async validateApiKey(rawKey: string): Promise<AuthenticatedMerchant | null> {
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      select: { id: true, merchant: { select: merchantProfileSelect } },
    });
    if (!apiKey || apiKey.merchant.status !== MerchantStatus.ACTIVE) return null;

    void this.prisma.apiKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((error: unknown) => {
        this.logger.warn({ err: error, apiKeyId: apiKey.id }, "failed to update API key usage");
      });

    return withMerchantRole(toMerchantProfile(apiKey.merchant));
  }

  async loginAdmin(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; admin: AdminPrincipal }> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, passwordHash: true, role: true, createdAt: true },
    });
    if (!admin) throw new UnauthorizedException("Invalid credentials");

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) throw new UnauthorizedException("Invalid credentials");

    const adminPrincipal: AdminPrincipal = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      createdAt: admin.createdAt,
    };
    const adminSecret = this.config.getOrThrow<string>("ADMIN_JWT_SECRET");
    const token = this.jwt.sign(
      { sub: admin.id, role: admin.role },
      { secret: adminSecret, expiresIn: "8h" },
    );
    return { accessToken: token, admin: adminPrincipal };
  }

  private async issueMerchantSession(merchant: MerchantProfileRecord) {
    const tokenPair = await this.issueTokenPair(merchant.id);
    return { ...tokenPair, merchant: toMerchantProfile(merchant) };
  }

  private async issueTokenPair(merchantId: string, family?: string) {
    const accessToken = this.jwt.sign(
      { sub: merchantId, role: "merchant" },
      { expiresIn: ACCESS_TOKEN_EXPIRY },
    );

    const rawRefreshToken = randomBytes(48).toString("hex");
    const tokenHash = createHash("sha256").update(rawRefreshToken).digest("hex");
    const tokenFamily = family ?? randomBytes(16).toString("hex");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await this.prisma.refreshToken.create({
      data: {
        merchantId,
        tokenHash,
        family: tokenFamily,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY,
    };
  }
}
