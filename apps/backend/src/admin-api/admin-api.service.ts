import type { FeePolicy } from "@egofi/types";
import { Injectable } from "@nestjs/common";
import type { FeePolicy as FeePolicyRow, MerchantStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../core/prisma.service";
import { LedgerService } from "../ledger/ledger.service";

// The DB stores fee config as flat columns; the API/UI use a nested DTO. Map
// between them here so the two shapes never leak into each other.
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
  ) {}

  async listMerchants(status?: string, page = 1, limit = 20) {
    const where: Prisma.MerchantWhereInput = status ? { status: status as MerchantStatus } : {};
    const [data, total] = await Promise.all([
      this.prisma.merchant.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          business: true,
          email: true,
          status: true,
          settlementAsset: true,
          createdAt: true,
        },
      }),
      this.prisma.merchant.count({ where }),
    ]);
    return { data, total };
  }

  async approveMerchant(id: string) {
    return this.prisma.merchant.update({
      where: { id },
      data: { status: "ACTIVE" },
    });
  }

  async suspendMerchant(id: string, _reason: string) {
    return this.prisma.merchant.update({
      where: { id },
      data: { status: "SUSPENDED" },
    });
  }

  async getFeePolicy(): Promise<FeePolicy> {
    // Get-or-create the singleton so the admin screen always has data.
    const row = await this.prisma.feePolicy.upsert({
      where: { id: "global" },
      update: {},
      create: { id: "global" },
    });
    return toFeePolicyDto(row);
  }

  /** Accepts the nested DTO shape and maps it to the flat columns. */
  async updateFeePolicy(dto: Partial<FeePolicy>): Promise<FeePolicy> {
    const data: Prisma.FeePolicyUpdateInput = {};
    if (dto.providerFeeShare) {
      if (dto.providerFeeShare.status) data.providerFeeStatus = dto.providerFeeShare.status;
      if (dto.providerFeeShare.adjustablePercent !== undefined)
        data.providerFeePercent = dto.providerFeeShare.adjustablePercent;
    }
    if (dto.quoteMarkup) {
      if (dto.quoteMarkup.status) data.quoteMarkupStatus = dto.quoteMarkup.status;
      if (dto.quoteMarkup.percent !== undefined) data.quoteMarkupPercent = dto.quoteMarkup.percent;
    }
    if (dto.merchantSaasFee) {
      if (dto.merchantSaasFee.status) data.saasStatus = dto.merchantSaasFee.status;
      if (dto.merchantSaasFee.amountUsd !== undefined)
        data.saasAmountUsd = dto.merchantSaasFee.amountUsd;
      if (dto.merchantSaasFee.intervalDays !== undefined)
        data.saasIntervalDays = dto.merchantSaasFee.intervalDays;
    }

    const row = await this.prisma.feePolicy.upsert({
      where: { id: "global" },
      update: data,
      create: { id: "global" },
    });
    return toFeePolicyDto(row);
  }

  async getReconciliation(from: Date, to: Date) {
    return this.ledger.reconcileSummary(from, to);
  }
}
