import type {
  CreateSubscriptionPlanDto,
  SubscriptionPeriodUnit,
  SubscriptionPlanDto,
} from "@egofi/types";
import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, SubscriptionPlan } from "@prisma/client";
import Decimal from "decimal.js";
import { PrismaService } from "../core/prisma.service";

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(merchantId: string, dto: CreateSubscriptionPlanDto): Promise<SubscriptionPlanDto> {
    const plan = await this.prisma.subscriptionPlan.create({
      data: {
        merchantId,
        title: dto.title.trim(),
        periodDuration: dto.periodDuration,
        periodUnit: dto.periodUnit,
        costPerPeriod: new Decimal(dto.costPerPeriod).toFixed(),
        currency: (dto.currency ?? "USD").toUpperCase(),
        ipnCallbackUrl: dto.ipnCallbackUrl?.trim() || null,
        successUrl: dto.successUrl?.trim() || null,
        failedUrl: dto.failedUrl?.trim() || null,
        partialUrl: dto.partialUrl?.trim() || null,
      },
    });
    return this.toDto(plan);
  }

  async list(
    merchantId: string,
    search?: string,
  ): Promise<{ data: SubscriptionPlanDto[]; total: number }> {
    const q = search?.trim();
    const where: Prisma.SubscriptionPlanWhereInput = {
      merchantId,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { id: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.subscriptionPlan.findMany({ where, orderBy: { createdAt: "desc" } }),
      this.prisma.subscriptionPlan.count({ where }),
    ]);
    return { data: data.map((p) => this.toDto(p)), total };
  }

  async get(merchantId: string, id: string): Promise<SubscriptionPlanDto> {
    const plan = await this.prisma.subscriptionPlan.findFirst({ where: { id, merchantId } });
    if (!plan) throw new NotFoundException(`Subscription plan ${id} not found`);
    return this.toDto(plan);
  }

  async remove(merchantId: string, id: string): Promise<{ ok: boolean }> {
    // Scope the delete to the merchant so one merchant can't remove another's plan.
    const res = await this.prisma.subscriptionPlan.deleteMany({ where: { id, merchantId } });
    if (res.count === 0) throw new NotFoundException(`Subscription plan ${id} not found`);
    return { ok: true };
  }

  private toDto(p: SubscriptionPlan): SubscriptionPlanDto {
    return {
      id: p.id,
      merchantId: p.merchantId,
      title: p.title,
      periodDuration: p.periodDuration,
      periodUnit: p.periodUnit as SubscriptionPeriodUnit,
      costPerPeriod: p.costPerPeriod.toString(),
      currency: p.currency,
      ipnCallbackUrl: p.ipnCallbackUrl,
      successUrl: p.successUrl,
      failedUrl: p.failedUrl,
      partialUrl: p.partialUrl,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}
