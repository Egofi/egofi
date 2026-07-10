import type {
  CreateSubscriptionPlanDto,
  PublicPlanDto,
  SubscribeDto,
  SubscribeResultDto,
  SubscriptionDto,
  SubscriptionPeriodUnit,
  SubscriptionPlanDto,
  SubscriptionStatus,
  UpdateSubscriptionPlanDto,
} from "@egofi/types";
import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { Prisma, Subscription, SubscriptionPlan } from "@prisma/client";
import Decimal from "decimal.js";
import { OutboxService } from "../core/outbox.service";
import { PrismaService } from "../core/prisma.service";
import { InvoicesService } from "../invoices/invoices.service";

/** Invoices for a subscription period stay payable for the whole period, capped at 7 days. */
const MAX_INVOICE_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Advances `from` by `duration` months/years, clamping to the last day of the
 * target month. Bare `setUTCMonth` overflows instead: Jan 31 + 1 month lands on
 * Mar 3, which would skip a subscriber's February billing entirely and drift
 * their anniversary date forward every period.
 */
function addMonths(from: Date, months: number): Date {
  const day = from.getUTCDate();
  const d = new Date(from.getTime());
  // Day 1 can't overflow, so the month shift is exact; then restore the day,
  // capped at however many days the target month actually has.
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const daysInTargetMonth = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(day, daysInTargetMonth));
  return d;
}

/** Advances `from` by `duration` × `unit` in UTC. */
export function addPeriod(from: Date, duration: number, unit: string): Date {
  const d = new Date(from.getTime());
  switch (unit) {
    case "DAY":
      d.setUTCDate(d.getUTCDate() + duration);
      return d;
    case "WEEK":
      d.setUTCDate(d.getUTCDate() + duration * 7);
      return d;
    case "YEAR":
      return addMonths(from, duration * 12);
    default:
      return addMonths(from, duration);
  }
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoices: InvoicesService,
    private readonly outbox: OutboxService,
  ) {}

  // ── Plans (merchant) ────────────────────────────────────────────

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
    return this.toPlanDto(plan);
  }

  async update(
    merchantId: string,
    id: string,
    dto: UpdateSubscriptionPlanDto,
  ): Promise<SubscriptionPlanDto> {
    await this.getPlanOrThrow(merchantId, id);

    const data: Prisma.SubscriptionPlanUpdateInput = {
      ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
      ...(dto.periodDuration !== undefined ? { periodDuration: dto.periodDuration } : {}),
      ...(dto.periodUnit !== undefined ? { periodUnit: dto.periodUnit } : {}),
      ...(dto.costPerPeriod !== undefined
        ? { costPerPeriod: new Decimal(dto.costPerPeriod).toFixed() }
        : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency.toUpperCase() } : {}),
      ...(dto.ipnCallbackUrl !== undefined
        ? { ipnCallbackUrl: dto.ipnCallbackUrl.trim() || null }
        : {}),
      ...(dto.successUrl !== undefined ? { successUrl: dto.successUrl.trim() || null } : {}),
      ...(dto.failedUrl !== undefined ? { failedUrl: dto.failedUrl.trim() || null } : {}),
      ...(dto.partialUrl !== undefined ? { partialUrl: dto.partialUrl.trim() || null } : {}),
      ...(dto.active !== undefined ? { active: dto.active } : {}),
    };

    const plan = await this.prisma.subscriptionPlan.update({ where: { id }, data });
    return this.toPlanDto(plan);
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
    return { data: data.map((p) => this.toPlanDto(p)), total };
  }

  async get(merchantId: string, id: string): Promise<SubscriptionPlanDto> {
    return this.toPlanDto(await this.getPlanOrThrow(merchantId, id));
  }

  async remove(merchantId: string, id: string): Promise<{ ok: boolean }> {
    const active = await this.prisma.subscription.count({
      where: { planId: id, merchantId, status: "ACTIVE" },
    });
    if (active > 0) {
      throw new BadRequestException(
        `This plan has ${active} active subscriber${active === 1 ? "" : "s"}. Deactivate it instead, or cancel them first.`,
      );
    }
    const res = await this.prisma.subscriptionPlan.deleteMany({ where: { id, merchantId } });
    if (res.count === 0) throw new NotFoundException(`Subscription plan ${id} not found`);
    return { ok: true };
  }

  // ── Public (hosted subscribe page) ──────────────────────────────

  async getPublicPlan(id: string): Promise<PublicPlanDto> {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
      include: { merchant: { select: { business: true } } },
    });
    if (!plan) throw new NotFoundException("Subscription plan not found");
    return {
      id: plan.id,
      title: plan.title,
      periodDuration: plan.periodDuration,
      periodUnit: plan.periodUnit as SubscriptionPeriodUnit,
      costPerPeriod: plan.costPerPeriod.toString(),
      currency: plan.currency,
      active: plan.active,
      merchantBusiness: plan.merchant.business,
    };
  }

  /** A customer subscribes: create the subscription and its first invoice. */
  async subscribe(planId: string, dto: SubscribeDto): Promise<SubscribeResultDto> {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException("Subscription plan not found");
    if (!plan.active) {
      throw new BadRequestException("This plan is no longer accepting new subscribers");
    }

    const email = dto.customerEmail.trim().toLowerCase();
    const existing = await this.prisma.subscription.findFirst({
      where: { planId, customerEmail: email, status: "ACTIVE" },
    });
    if (existing) {
      throw new BadRequestException("This email is already subscribed to this plan");
    }

    const now = new Date();
    const periodEnd = addPeriod(now, plan.periodDuration, plan.periodUnit);

    const subscription = await this.prisma.subscription.create({
      data: {
        planId,
        merchantId: plan.merchantId,
        customerEmail: email,
        payAsset: dto.payAsset,
        payChain: dto.payChain,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        // Bill again when this first period ends.
        nextBillingAt: periodEnd,
      },
    });

    const invoiceId = await this.issueInvoiceFor(subscription, plan);
    return { subscription: this.toSubscriptionDto(subscription), invoiceId };
  }

  // ── Subscribers (merchant) ──────────────────────────────────────

  async listSubscribers(
    merchantId: string,
    planId: string,
  ): Promise<{ data: SubscriptionDto[]; total: number }> {
    await this.getPlanOrThrow(merchantId, planId);
    const rows = await this.prisma.subscription.findMany({
      where: { planId, merchantId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { invoices: true } } },
    });
    return {
      data: rows.map((r) => ({
        ...this.toSubscriptionDto(r),
        invoiceCount: r._count.invoices,
      })),
      total: rows.length,
    };
  }

  async cancelSubscription(merchantId: string, subscriptionId: string): Promise<SubscriptionDto> {
    const sub = await this.prisma.subscription.findFirst({
      where: { id: subscriptionId, merchantId },
    });
    if (!sub) throw new NotFoundException("Subscription not found");
    if (sub.status === "CANCELED") return this.toSubscriptionDto(sub);

    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: "CANCELED", canceledAt: new Date() },
    });
    this.logger.log({ subscriptionId, merchantId }, "subscription canceled");
    return this.toSubscriptionDto(updated);
  }

  // ── Recurring billing (job) ─────────────────────────────────────

  /**
   * Issues the next invoice for every ACTIVE subscription whose period has
   * elapsed, then rolls the period forward. Idempotent per period: the cursor
   * only advances once the invoice is created.
   */
  async billDueSubscriptions(now = new Date()): Promise<{ billed: number }> {
    const due = await this.prisma.subscription.findMany({
      where: { status: "ACTIVE", nextBillingAt: { lte: now } },
      include: { plan: true },
      take: 100,
    });

    let billed = 0;
    for (const sub of due) {
      try {
        await this.issueInvoiceFor(sub, sub.plan);
        const periodStart = sub.currentPeriodEnd;
        const periodEnd = addPeriod(periodStart, sub.plan.periodDuration, sub.plan.periodUnit);
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: {
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            nextBillingAt: periodEnd,
          },
        });
        billed++;
      } catch (error) {
        this.logger.error({ err: error, subscriptionId: sub.id }, "subscription billing failed");
      }
    }
    return { billed };
  }

  // ── Internals ───────────────────────────────────────────────────

  /** Creates the invoice for one billing period and announces it via the outbox. */
  private async issueInvoiceFor(
    sub: Pick<Subscription, "id" | "merchantId" | "customerEmail" | "payAsset" | "payChain">,
    plan: Pick<
      SubscriptionPlan,
      "id" | "currency" | "costPerPeriod" | "periodDuration" | "periodUnit"
    >,
  ): Promise<string> {
    const ttlSeconds = Math.min(
      MAX_INVOICE_TTL_SECONDS,
      Math.max(
        3600,
        Math.round(
          (addPeriod(new Date(), plan.periodDuration, plan.periodUnit).getTime() - Date.now()) /
            1000,
        ),
      ),
    );

    const invoice = await this.invoices.create(
      {
        merchantId: sub.merchantId,
        displayCurrency: plan.currency,
        displayAmount: plan.costPerPeriod.toString(),
        payAsset: sub.payAsset,
        payChain: sub.payChain,
        ttlSeconds,
        metadata: { subscriptionId: sub.id, planId: plan.id },
      },
      "0",
      "0",
    );

    await this.prisma.tenantTransaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { subscriptionId: sub.id, notifyEmail: sub.customerEmail },
      });
      await this.outbox.emit(tx, {
        aggregate: "subscription",
        aggregateId: sub.id,
        type: "subscription.invoice_created",
        payload: {
          subscriptionId: sub.id,
          planId: plan.id,
          merchantId: sub.merchantId,
          invoiceId: invoice.id,
          customerEmail: sub.customerEmail,
        },
      });
    });

    return invoice.id;
  }

  private async getPlanOrThrow(merchantId: string, id: string): Promise<SubscriptionPlan> {
    const plan = await this.prisma.subscriptionPlan.findFirst({ where: { id, merchantId } });
    if (!plan) throw new NotFoundException(`Subscription plan ${id} not found`);
    return plan;
  }

  private toPlanDto(p: SubscriptionPlan): SubscriptionPlanDto {
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
      active: p.active,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  private toSubscriptionDto(s: Subscription): SubscriptionDto {
    return {
      id: s.id,
      planId: s.planId,
      merchantId: s.merchantId,
      customerEmail: s.customerEmail,
      payAsset: s.payAsset,
      payChain: s.payChain,
      status: s.status as SubscriptionStatus,
      currentPeriodStart: s.currentPeriodStart.toISOString(),
      currentPeriodEnd: s.currentPeriodEnd.toISOString(),
      nextBillingAt: s.nextBillingAt.toISOString(),
      canceledAt: s.canceledAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
    };
  }
}
