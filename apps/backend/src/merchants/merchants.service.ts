import { createHash, randomBytes } from "node:crypto";
import { isIP } from "node:net";
import type { IntegrationSettingsDto, UpdateProfileDto, UpdateSettlementDto } from "@egofi/types";
import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Prisma } from "@prisma/client";
import { ComplianceService } from "../compliance/compliance.service";
import { CryptoService } from "../core/crypto.service";
import { PrismaService } from "../core/prisma.service";
import { XpubDerivationService } from "../rails/direct-transfer/xpub-derivation.service";
import { merchantProfileSelect, toMerchantProfile } from "./merchant.presenter";

@Injectable()
export class MerchantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly compliance: ComplianceService,
    private readonly config: ConfigService,
    private readonly crypto: CryptoService,
  ) {}

  async updateProfile(merchantId: string, dto: UpdateProfileDto) {
    const merchant = await this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        ...(dto.business ? { business: dto.business.trim() } : {}),
      },
      select: merchantProfileSelect,
    });
    return toMerchantProfile(merchant);
  }

  async updateSettlement(merchantId: string, dto: UpdateSettlementDto) {
    if (dto.settlementAddresses) {
      for (const [chain, address] of Object.entries(dto.settlementAddresses)) {
        if (typeof address === "string" && address.length > 0) {
          await this.compliance.assertAddressClear(address, chain, "settlement");
        }
      }
    }

    // Reject an unparseable xpub up front — otherwise xpub mode would silently
    // fall back to the static address at payment time and confuse the merchant.
    if (dto.xpub && !XpubDerivationService.isValidXpub(dto.xpub)) {
      throw new BadRequestException(
        "That extended public key (xpub) is not valid. Paste the account-level xpub from your wallet.",
      );
    }
    if (dto.xpubTron && !XpubDerivationService.isValidXpub(dto.xpubTron)) {
      throw new BadRequestException("The Tron extended public key (xpub) is not valid.");
    }

    const webhookUrl =
      dto.webhookUrl !== undefined ? this.normalizeCallbackUrl(dto.webhookUrl) : undefined;

    const merchant = await this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        ...(dto.settlementAsset ? { settlementAsset: dto.settlementAsset } : {}),
        ...(dto.settlementAddresses
          ? { settlementAddresses: dto.settlementAddresses as Prisma.InputJsonValue }
          : {}),
        ...(dto.xpub !== undefined ? { xpub: dto.xpub || null } : {}),
        ...(dto.xpubTron !== undefined ? { xpubTron: dto.xpubTron || null } : {}),
        ...(dto.xpubMode !== undefined ? { xpubMode: dto.xpubMode } : {}),
        ...(webhookUrl !== undefined ? { webhookUrl } : {}),
      },
      select: merchantProfileSelect,
    });
    return toMerchantProfile(merchant);
  }

  async createApiKey(merchantId: string, name: string) {
    const normalizedName = name.trim();
    if (!normalizedName || normalizedName.length > 80) {
      throw new BadRequestException("API key name must be 1-80 characters");
    }

    const rawKey = `egofi_${randomBytes(32).toString("hex")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");

    const created = await this.prisma.apiKey.create({
      data: { merchantId, name: normalizedName, keyHash },
      select: { id: true, name: true },
    });

    return { key: rawKey, id: created.id, name: created.name };
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

  async getIntegration(merchantId: string): Promise<IntegrationSettingsDto> {
    const merchant = await this.prisma.merchant.findUniqueOrThrow({
      where: { id: merchantId },
      select: { webhookUrl: true, webhookSecret: true },
    });
    return {
      webhookUrl: merchant.webhookUrl ?? null,
      ipnSecret: merchant.webhookSecret ? this.crypto.decryptMaybe(merchant.webhookSecret) : null,
    };
  }

  async setWebhookUrl(
    merchantId: string,
    webhookUrl: string | null,
  ): Promise<IntegrationSettingsDto> {
    const url = this.normalizeCallbackUrl(webhookUrl);
    const merchant = await this.prisma.merchant.update({
      where: { id: merchantId },
      data: { webhookUrl: url },
      select: { webhookUrl: true, webhookSecret: true },
    });
    return {
      webhookUrl: merchant.webhookUrl ?? null,
      ipnSecret: merchant.webhookSecret ? this.crypto.decryptMaybe(merchant.webhookSecret) : null,
    };
  }

  async rotateIpnSecret(merchantId: string): Promise<{ ipnSecret: string }> {
    const ipnSecret = `whsec_${randomBytes(32).toString("hex")}`;
    await this.prisma.merchant.update({
      where: { id: merchantId },
      data: { webhookSecret: this.crypto.encrypt(ipnSecret) },
    });
    return { ipnSecret };
  }

  private normalizeCallbackUrl(webhookUrl: string | null | undefined): string | null {
    const raw = webhookUrl?.trim();
    if (!raw) return null;

    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      throw new BadRequestException("Webhook URL must be a valid absolute URL");
    }

    if (parsed.username || parsed.password) {
      throw new BadRequestException("Webhook URL must not contain credentials");
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new BadRequestException("Webhook URL must use HTTP or HTTPS");
    }

    const nodeEnv = this.config.get<string>("NODE_ENV", "development");
    const isDeployed = nodeEnv === "production" || nodeEnv === "staging";
    if (isDeployed && parsed.protocol !== "https:") {
      throw new BadRequestException("Webhook URL must use HTTPS in deployed environments");
    }
    if (isPrivateHost(parsed.hostname)) {
      throw new BadRequestException("Webhook URL must not target localhost or private networks");
    }

    return parsed.toString();
  }
}

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  if (host === "localhost" || host.endsWith(".localhost")) return true;

  const ipVersion = isIP(host);
  if (ipVersion === 4) {
    const parts = host.split(".").map((part) => Number(part));
    const [a = 0, b = 0] = parts;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  if (ipVersion === 6) {
    return (
      host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:")
    );
  }
  return false;
}
