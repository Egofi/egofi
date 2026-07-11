import type { FeePolicy } from "@egofi/types";
import { Injectable } from "@nestjs/common";
import type { FeePolicy as FeePolicyRow, MerchantStatus, Prisma } from "@prisma/client";
import type { AdminPrincipal } from "../auth/principals";
import { AuditService } from "../core/audit.service";
import { PrismaService } from "../core/prisma.service";
import { LedgerService } from "../ledger/ledger.service";
import { merchantProfileSelect, toMerchantProfile } from "../merchants/merchant.presenter";

type DeprecationNotes = {
  providerFeeShare?: string;
  quoteMarkup?: string;
  merchantSaasFee?: string;
};

function toFeePolicyDto(row: FeePolicyRow): FeePolicy {
  const notes = (row.deprecationNotes as DeprecationNotes | null) ?? {};
  return {
    id: row.id,
    providerFeeShare: {
      status: row.providerFeeStatus as FeePolicy["providerFeeShare"]["status"],
      adjustablePercent: Number(row.providerFeePercent),
      ...(notes.providerFeeShare ? { deprecationNote: notes.providerFeeShare } : {}),
    },
    quoteMarkup: {
      status: row.quoteMarkupStatus as FeePolicy["quoteMarkup"]["status"],
      percent: Number(row.quoteMarkupPercent),
      ...(notes.quoteMarkup ? { deprecationNote: notes.quoteMarkup } : {}),
    },
    merchantSaasFee: {
      status: row.saasStatus as FeePolicy["merchantSaasFee"]["status"],
      amountUsd: Number(row.saasAmountUsd),
      intervalDays: row.saasIntervalDays,
      ...(notes.merchantSaasFee ? { deprecationNote: notes.merchantSaasFee } : {}),
    },
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class AdminApiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
  ) {}

  async listMerchants(status?: string, page = 1, limit = 20) {
    const safePage = Math.max(1, Math.floor(page));
    const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
    const where: Prisma.MerchantWhereInput = status ? { status: status as MerchantStatus } : {};
    const [data, total] = await Promise.all([
      this.prisma.merchant.findMany({
        where,
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        orderBy: { createdAt: "desc" },
        select: merchantProfileSelect,
      }),
      this.prisma.merchant.count({ where }),
    ]);
    return { data: data.map(toMerchantProfile), total };
  }

  async approveMerchant(id: string, actor: AdminPrincipal, ip?: string) {
    const before = await this.prisma.merchant.findUniqueOrThrow({
      where: { id },
      select: { status: true },
    });

    const updated = await this.prisma.merchant.update({
      where: { id },
      data: { status: "ACTIVE" },
      select: merchantProfileSelect,
    });

    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "merchant.approve",
      targetType: "merchant",
      targetId: id,
      before: { status: before.status },
      after: { status: "ACTIVE" },
      ip,
    });

    return toMerchantProfile(updated);
  }

  async suspendMerchant(id: string, reason: string, actor: AdminPrincipal, ip?: string) {
    const before = await this.prisma.merchant.findUniqueOrThrow({
      where: { id },
      select: { status: true },
    });

    const updated = await this.prisma.merchant.update({
      where: { id },
      data: { status: "SUSPENDED" },
      select: merchantProfileSelect,
    });

    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "merchant.suspend",
      targetType: "merchant",
      targetId: id,
      before: { status: before.status },
      after: { status: "SUSPENDED", reason: reason.trim() },
      ip,
    });

    return toMerchantProfile(updated);
  }

  async reactivateMerchant(id: string, actor: AdminPrincipal, ip?: string) {
    const before = await this.prisma.merchant.findUniqueOrThrow({
      where: { id },
      select: { status: true },
    });
    const updated = await this.prisma.merchant.update({
      where: { id },
      data: { status: "ACTIVE" },
      select: merchantProfileSelect,
    });
    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "merchant.reactivate",
      targetType: "merchant",
      targetId: id,
      before: { status: before.status },
      after: { status: "ACTIVE" },
      ip,
    });
    return toMerchantProfile(updated);
  }

  async getFeePolicy(): Promise<FeePolicy> {
    const row = await this.prisma.feePolicy.upsert({
      where: { id: "global" },
      update: {},
      create: { id: "global" },
    });
    return toFeePolicyDto(row);
  }

  async updateFeePolicy(
    dto: Partial<FeePolicy>,
    actor: AdminPrincipal,
    ip?: string,
  ): Promise<FeePolicy> {
    const beforeRow = await this.prisma.feePolicy.findUnique({ where: { id: "global" } });
    const beforeDto = beforeRow ? toFeePolicyDto(beforeRow) : null;

    const data: Prisma.FeePolicyUpdateInput = {};
    if (dto.providerFeeShare) {
      if (dto.providerFeeShare.status) data.providerFeeStatus = dto.providerFeeShare.status;
      if (dto.providerFeeShare.adjustablePercent !== undefined) {
        data.providerFeePercent = dto.providerFeeShare.adjustablePercent;
      }
    }
    if (dto.quoteMarkup) {
      if (dto.quoteMarkup.status) data.quoteMarkupStatus = dto.quoteMarkup.status;
      if (dto.quoteMarkup.percent !== undefined) data.quoteMarkupPercent = dto.quoteMarkup.percent;
    }
    if (dto.merchantSaasFee) {
      if (dto.merchantSaasFee.status) data.saasStatus = dto.merchantSaasFee.status;
      if (dto.merchantSaasFee.amountUsd !== undefined) {
        data.saasAmountUsd = dto.merchantSaasFee.amountUsd;
      }
      if (dto.merchantSaasFee.intervalDays !== undefined) {
        data.saasIntervalDays = dto.merchantSaasFee.intervalDays;
      }
    }

    const row = await this.prisma.feePolicy.upsert({
      where: { id: "global" },
      update: data,
      create: { id: "global" },
    });
    const afterDto = toFeePolicyDto(row);

    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "fee-policy.update",
      targetType: "fee-policy",
      targetId: "global",
      before: beforeDto as unknown as Prisma.InputJsonValue,
      after: afterDto as unknown as Prisma.InputJsonValue,
      ip,
    });

    return afterDto;
  }

  async getReconciliation(from: Date, to: Date) {
    return this.ledger.reconcileSummary(from, to);
  }

  async getAuditLog(page = 1, limit = 50, targetType?: string) {
    return this.audit.list(page, limit, targetType ? { targetType } : undefined);
  }
}
