import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import Decimal from "decimal.js";
import { PrismaService } from "../core/prisma.service";
import { ScreeningVerdict } from "@egofi/types";
import { volumeCapForTier } from "../kyb/kyb.tiers";

export interface ComplianceCheck {
  merchantId: string;
  invoiceId: string;
  amount: string;
  asset: string;
  fromAddress?: string;
}

export type ComplianceResult = "PASS" | "REVIEW" | "BLOCK";

// Tiered KYB (§14): volume limits scale with tier. Caps live in the canonical
// tier ladder (kyb/kyb.tiers.ts) so the enforcement here and the merchant UI
// can never drift.

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Run compliance checks on an incoming payment.
   * Extend this to integrate AML screening services (Chainalysis, Elliptic, etc.)
   */
  async check(params: ComplianceCheck): Promise<ComplianceResult> {
    this.logger.debug({ ...params }, "Compliance check");

    const amountNum = parseFloat(params.amount);
    if (amountNum > 10_000) {
      this.logger.warn({ ...params }, "Large transaction flagged for review");
      return "REVIEW";
    }

    return "PASS";
  }

  /**
   * Enforces the merchant's KYB-tier 30-day volume cap (§14). Called at
   * invoice creation; throws when the new invoice would exceed the cap.
   */
  async enforceVolumeLimit(merchantId: string, invoiceAmountUsd: string): Promise<void> {
    const merchant = await this.prisma.merchant.findUniqueOrThrow({
      where: { id: merchantId },
      select: { kybTier: true },
    });

    const limit = volumeCapForTier(merchant.kybTier);
    if (!Number.isFinite(limit)) return;

    const since = new Date(Date.now() - 30 * 24 * 3_600_000);
    const aggregate = await this.prisma.invoice.aggregate({
      where: {
        merchantId,
        createdAt: { gte: since },
        state: { notIn: ["DRAFT", "EXPIRED", "FAILED"] },
      },
      _sum: { displayAmount: true },
    });

    const rolling = new Decimal(aggregate._sum.displayAmount?.toString() ?? "0");
    const projected = rolling.plus(invoiceAmountUsd);

    if (projected.gt(limit)) {
      this.logger.warn(
        { merchantId, rolling: rolling.toString(), limit },
        "KYB volume cap exceeded",
      );
      throw new BadRequestException(
        `This invoice would exceed your 30-day volume limit of $${limit.toLocaleString()} for your current verification tier. Complete the next KYB tier to raise it.`,
      );
    }
  }

  /**
   * Sanctions/illicit-address screening (§14) at the edges egofi controls:
   * merchant settlement addresses at onboarding and customer refund addresses
   * at collection. Swap in a Chainalysis-oracle (or equivalent) adapter here;
   * the local denylist is the always-on floor.
   */
  async screenAddress(address: string, chain: string): Promise<ScreeningVerdict> {
    const normalized = address.trim().toLowerCase();

    if (LOCAL_DENYLIST.has(normalized)) {
      this.logger.error({ address, chain }, "address matched sanctions denylist");
      return ScreeningVerdict.Sanctioned;
    }

    // Extension point: call external screening oracle; on FLAGGED, route to
    // the manual review queue instead of hard-rejecting.
    return ScreeningVerdict.Clear;
  }

  /** Throws when a settlement/refund address fails screening. */
  async assertAddressClear(address: string, chain: string, role: "settlement" | "refund"): Promise<void> {
    const verdict = await this.screenAddress(address, chain);
    if (verdict === ScreeningVerdict.Sanctioned) {
      throw new BadRequestException(
        `The ${role} address provided cannot be accepted.`,
      );
    }
  }

  async queueForReview(merchantId: string, invoiceId: string, reason: string) {
    this.logger.warn({ merchantId, invoiceId, reason }, "Invoice queued for compliance review");
    // Extend: insert into a review queue table, notify compliance team
  }
}

// Seed with known-sanctioned addresses; replace/augment with an oracle feed.
const LOCAL_DENYLIST = new Set<string>([]);
