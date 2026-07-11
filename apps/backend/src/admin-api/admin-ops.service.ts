import type {
  AdminInvoiceDetail,
  AdminInvoiceListItem,
  AdminMerchantDetail,
  AdminOpsHealthDto,
  AdminPagedResult,
  AdminSubscriptionRow,
  UnmatchedPaymentDto,
} from "@egofi/types";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { InvoiceState, Prisma } from "@prisma/client";
import type { AdminPrincipal } from "../auth/principals";
import { AuditService } from "../core/audit.service";
import { PrismaService } from "../core/prisma.service";

const PAGE_MAX = 100;

/**
 * Cross-tenant reads and reversible operational actions for the ops console.
 * Runs without a merchant context, so RLS is permissive and every query spans
 * all tenants. Every mutation is written to the admin audit log.
 */
@Injectable()
export class AdminOpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private toInvoiceListItem(
    inv: Prisma.InvoiceGetPayload<{ include: { merchant: { select: { business: true } } } }>,
  ): AdminInvoiceListItem {
    return {
      id: inv.id,
      merchantId: inv.merchantId,
      merchantBusiness: inv.merchant.business,
      displayAmount: inv.displayAmount.toString(),
      displayCurrency: inv.displayCurrency,
      payAsset: inv.payAsset,
      payChain: inv.payChain,
      state: inv.state,
      rail: inv.rail,
      subscriptionId: inv.subscriptionId,
      createdAt: inv.createdAt.toISOString(),
    };
  }

  private clampPage(page: number, limit: number) {
    return {
      skip: (Math.max(1, Math.floor(page)) - 1) * Math.min(PAGE_MAX, Math.max(1, limit)),
      take: Math.min(PAGE_MAX, Math.max(1, Math.floor(limit))),
    };
  }

  // ── Invoices (all tenants) ──────────────────────────────────────

  async listInvoices(filters: {
    state?: string;
    merchantId?: string;
    chain?: string;
    page: number;
    limit: number;
  }): Promise<AdminPagedResult<AdminInvoiceListItem>> {
    const where: Prisma.InvoiceWhereInput = {};
    if (filters.state) where.state = filters.state as InvoiceState;
    if (filters.merchantId) where.merchantId = filters.merchantId;
    if (filters.chain) where.payChain = filters.chain;
    const { skip, take } = this.clampPage(filters.page, filters.limit);
    const [rows, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: { merchant: { select: { business: true } } },
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { data: rows.map((r) => this.toInvoiceListItem(r)), total };
  }

  async getInvoiceDetail(id: string): Promise<AdminInvoiceDetail> {
    const inv = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        merchant: { select: { business: true } },
        events: { orderBy: { ts: "asc" } },
        ledgerEntries: { orderBy: { ts: "asc" } },
      },
    });
    if (!inv) throw new NotFoundException(`Invoice ${id} not found`);
    return {
      ...this.toInvoiceListItem(inv),
      quotedAmount: inv.quotedAmount.toString(),
      rate: inv.rate.toString(),
      depositAddress: inv.depositAddress,
      refundAddress: inv.refundAddress,
      notifyEmail: inv.notifyEmail,
      expiresAt: inv.expiresAt.toISOString(),
      events: inv.events.map((e) => ({
        id: e.id,
        type: e.type,
        rail: e.rail,
        txHash: e.txHash,
        amount: e.amount?.toString() ?? null,
        asset: e.asset,
        ts: e.ts.toISOString(),
      })),
      ledger: inv.ledgerEntries.map((l) => ({
        id: l.id,
        kind: l.kind,
        amount: l.amount.toString(),
        asset: l.asset,
        ts: l.ts.toISOString(),
      })),
    };
  }

  // ── Merchant detail ─────────────────────────────────────────────

  async getMerchantDetail(id: string): Promise<AdminMerchantDetail> {
    const m = await this.prisma.merchant.findUnique({ where: { id } });
    if (!m) throw new NotFoundException(`Merchant ${id} not found`);

    const [invoices, paidInvoices, settledRow, activeSubscribers, apiKeys, recent] =
      await Promise.all([
        this.prisma.invoice.count({ where: { merchantId: id } }),
        this.prisma.invoice.count({ where: { merchantId: id, state: "PAID_CONFIRMED" } }),
        this.prisma.$queryRaw<{ v: string | null }[]>`
          SELECT coalesce(sum("displayAmount") FILTER (
            WHERE state = 'PAID_CONFIRMED' AND "displayCurrency" IN ('USD','USDT','USDC')), 0)::text AS v
          FROM "Invoice" WHERE "merchantId" = ${id}`,
        this.prisma.subscription.count({ where: { merchantId: id, status: "ACTIVE" } }),
        this.prisma.apiKey.count({ where: { merchantId: id } }),
        this.prisma.invoice.findMany({
          where: { merchantId: id },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { merchant: { select: { business: true } } },
        }),
      ]);

    return {
      id: m.id,
      business: m.business,
      email: m.email,
      status: m.status,
      kybStatus: m.kybStatus,
      kybTier: m.kybTier,
      settlementAsset: m.settlementAsset,
      createdAt: m.createdAt.toISOString(),
      stats: {
        invoices,
        paidInvoices,
        settledUsd: Number(settledRow[0]?.v ?? "0").toFixed(2),
        activeSubscribers,
        apiKeys,
      },
      recentInvoices: recent.map((r) => this.toInvoiceListItem(r)),
    };
  }

  // ── Subscriptions (all tenants) ─────────────────────────────────

  async listSubscriptions(
    page: number,
    limit: number,
  ): Promise<AdminPagedResult<AdminSubscriptionRow>> {
    const { skip, take } = this.clampPage(page, limit);
    const [rows, total] = await Promise.all([
      this.prisma.subscription.findMany({
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          plan: { select: { title: true, costPerPeriod: true, currency: true } },
          merchant: { select: { business: true } },
          _count: { select: { invoices: true } },
        },
      }),
      this.prisma.subscription.count(),
    ]);
    return {
      data: rows.map((s) => ({
        id: s.id,
        planTitle: s.plan.title,
        merchantId: s.merchantId,
        merchantBusiness: s.merchant.business,
        customerEmail: s.customerEmail,
        status: s.status,
        costPerPeriod: s.plan.costPerPeriod.toString(),
        currency: s.plan.currency,
        nextBillingAt: s.nextBillingAt.toISOString(),
        invoiceCount: s._count.invoices,
      })),
      total,
    };
  }

  // ── Unmatched payments ──────────────────────────────────────────

  async listUnmatched(status = "open"): Promise<UnmatchedPaymentDto[]> {
    const rows = await this.prisma.unmatchedPayment.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
      take: PAGE_MAX,
    });
    return rows.map((r) => ({
      id: r.id,
      address: r.address,
      asset: r.asset,
      chain: r.chain,
      amount: r.amount.toString(),
      txHash: r.txHash,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async resolveUnmatched(
    id: string,
    status: "resolved" | "returned",
    actor: AdminPrincipal,
    ip?: string,
  ): Promise<UnmatchedPaymentDto> {
    const before = await this.prisma.unmatchedPayment.findUnique({ where: { id } });
    if (!before) throw new NotFoundException(`Unmatched payment ${id} not found`);
    const row = await this.prisma.unmatchedPayment.update({ where: { id }, data: { status } });
    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: `unmatched.${status}`,
      targetType: "unmatched-payment",
      targetId: id,
      before: { status: before.status },
      after: { status },
      ip,
    });
    return {
      id: row.id,
      address: row.address,
      asset: row.asset,
      chain: row.chain,
      amount: row.amount.toString(),
      txHash: row.txHash,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    };
  }

  // ── Operational health ──────────────────────────────────────────

  async opsHealth(): Promise<AdminOpsHealthDto> {
    const [pending, dead, oldest, delivered, failing, recentFailures, providerRows, unmatched] =
      await Promise.all([
        this.prisma.outboxEvent.count({ where: { status: "pending" } }),
        this.prisma.outboxEvent.count({ where: { status: "dead" } }),
        this.prisma.outboxEvent.findFirst({
          where: { status: "pending" },
          orderBy: { createdAt: "asc" },
          select: { createdAt: true },
        }),
        this.prisma.webhookDelivery.count({ where: { status: "DELIVERED" } }),
        this.prisma.webhookDelivery.count({ where: { status: "FAILED" } }),
        this.prisma.webhookDelivery.findMany({
          where: { status: "FAILED" },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, merchantId: true, event: true, attempts: true, createdAt: true },
        }),
        this.prisma.$queryRaw<
          {
            provider: string;
            successRate: string;
            freezeRate: string;
            medianSettleMs: number;
            sampleSize: number;
            createdAt: Date;
          }[]
        >`
          SELECT DISTINCT ON (provider) provider, "successRate"::text, "freezeRate"::text,
            "medianSettleMs", "sampleSize", "createdAt"
          FROM "ProviderHealthSnapshot" ORDER BY provider, "createdAt" DESC`,
        this.prisma.unmatchedPayment.count({ where: { status: "open" } }),
      ]);

    return {
      outbox: {
        pending,
        dead,
        oldestPendingAgeSec: oldest
          ? Math.round((Date.now() - oldest.createdAt.getTime()) / 1000)
          : null,
      },
      webhooks: {
        delivered,
        failing,
        recentFailures: recentFailures.map((w) => ({
          id: w.id,
          merchantId: w.merchantId,
          event: w.event,
          attempts: w.attempts,
          createdAt: w.createdAt.toISOString(),
        })),
      },
      providers: providerRows.map((p) => ({
        provider: p.provider,
        successRate: Number(p.successRate),
        freezeRate: Number(p.freezeRate),
        medianSettleMs: p.medianSettleMs,
        sampleSize: p.sampleSize,
        at: p.createdAt.toISOString(),
      })),
      unmatched: { open: unmatched },
    };
  }

  async retryOutbox(id: string, actor: AdminPrincipal, ip?: string): Promise<{ ok: boolean }> {
    const ev = await this.prisma.outboxEvent.findUnique({ where: { id } });
    if (!ev) throw new NotFoundException(`Outbox event ${id} not found`);
    if (ev.status === "delivered") {
      throw new BadRequestException("Event already delivered");
    }
    // Re-arm for the dispatcher: back to pending, due now.
    await this.prisma.outboxEvent.update({
      where: { id },
      data: { status: "pending", nextAttempt: new Date() },
    });
    await this.audit.record({
      actorId: actor.id,
      actorEmail: actor.email,
      action: "outbox.retry",
      targetType: "outbox-event",
      targetId: id,
      before: { status: ev.status, attempts: ev.attempts },
      after: { status: "pending" },
      ip,
    });
    return { ok: true };
  }
}
