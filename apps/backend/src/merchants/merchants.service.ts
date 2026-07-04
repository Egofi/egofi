import { createHash, randomBytes } from "node:crypto";
import type { IntegrationSettingsDto, UpdateProfileDto, UpdateSettlementDto } from "@egofi/types";
import { BadRequestException, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { ComplianceService } from "../compliance/compliance.service";
import { PrismaService } from "../core/prisma.service";

@Injectable()
export class MerchantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly compliance: ComplianceService,
  ) {}

  async updateProfile(merchantId: string, dto: UpdateProfileDto) {
    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        ...(dto.business ? { business: dto.business } : {}),
      },
    });
  }

  async updateSettlement(merchantId: string, dto: UpdateSettlementDto) {
    // Sanctions-screen settlement addresses at onboarding (§14): refuse a
    // sanctioned payout destination before it ever receives a payment.
    if (dto.settlementAddresses) {
      for (const [chain, address] of Object.entries(dto.settlementAddresses)) {
        if (typeof address === "string" && address.length > 0) {
          await this.compliance.assertAddressClear(address, chain, "settlement");
        }
      }
    }

    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        ...(dto.settlementAsset ? { settlementAsset: dto.settlementAsset } : {}),
        ...(dto.settlementAddresses
          ? { settlementAddresses: dto.settlementAddresses as Prisma.InputJsonValue }
          : {}),
        ...(dto.xpub !== undefined ? { xpub: dto.xpub } : {}),
        ...(dto.xpubMode !== undefined ? { xpubMode: dto.xpubMode } : {}),
        ...(dto.webhookUrl !== undefined ? { webhookUrl: dto.webhookUrl } : {}),
      },
    });
  }

  async createApiKey(merchantId: string, name: string) {
    const rawKey = `egofi_${randomBytes(32).toString("hex")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");

    await this.prisma.apiKey.create({
      data: { merchantId, name, keyHash },
    });

    return { key: rawKey, name };
  }

  async listApiKeys(merchantId: string) {
    return this.prisma.apiKey.findMany({
      where: { merchantId },
      select: { id: true, name: true, createdAt: true, lastUsedAt: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async deleteApiKey(merchantId: string, keyId: string) {
    await this.prisma.apiKey.deleteMany({
      where: { id: keyId, merchantId },
    });
  }

  // ── Gateway integration (webhook / IPN) ─────────────────────────────────

  async getIntegration(merchantId: string): Promise<IntegrationSettingsDto> {
    const m = await this.prisma.merchant.findUniqueOrThrow({
      where: { id: merchantId },
      select: { webhookUrl: true, webhookSecret: true },
    });
    return { webhookUrl: m.webhookUrl ?? null, ipnSecret: m.webhookSecret ?? null };
  }

  async setWebhookUrl(
    merchantId: string,
    webhookUrl: string | null,
  ): Promise<IntegrationSettingsDto> {
    const url = webhookUrl?.trim() || null;
    if (url && !/^https?:\/\/.+/i.test(url)) {
      throw new BadRequestException("Webhook URL must be a valid http(s) URL");
    }
    const m = await this.prisma.merchant.update({
      where: { id: merchantId },
      data: { webhookUrl: url },
      select: { webhookUrl: true, webhookSecret: true },
    });
    return { webhookUrl: m.webhookUrl ?? null, ipnSecret: m.webhookSecret ?? null };
  }

  /** Generate (or rotate) the HMAC secret egofi signs this merchant's webhooks with. */
  async rotateIpnSecret(merchantId: string): Promise<{ ipnSecret: string }> {
    const ipnSecret = `whsec_${randomBytes(32).toString("hex")}`;
    await this.prisma.merchant.update({
      where: { id: merchantId },
      data: { webhookSecret: ipnSecret },
    });
    return { ipnSecret };
  }
}
