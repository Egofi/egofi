import type {
  AdminBreakdownDto,
  AdminInterval,
  AdminMetric,
  AdminOverviewDto,
  AdminTimeseriesDto,
} from "@egofi/types";
import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../core/prisma.service";

// Invoices priced in these display currencies count 1:1 toward the USD figures.
// We never invent an FX rate — non-USD invoices are still counted, just not
// summed into USD volume (and the per-currency picture lives in the breakdown).
const USD_CURRENCIES = ["USD", "USDT", "USDC"];

const VALID_INTERVALS: AdminInterval[] = ["day", "week", "month"];

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(): Promise<AdminOverviewDto> {
    const usd = Prisma.join(USD_CURRENCIES);

    const [
      merchantRows,
      invoiceRows,
      volumeRow,
      subs,
      plans,
      mrrRow,
      unmatchedOpen,
      outboxPending,
      outboxDead,
      webhooksFailing,
      kybPending,
    ] = await Promise.all([
      this.prisma.$queryRaw<{ status: string; n: bigint }[]>`
        SELECT status, count(*)::bigint AS n FROM "Merchant" GROUP BY status`,
      this.prisma.$queryRaw<{ state: string; n: bigint }[]>`
        SELECT state::text AS state, count(*)::bigint AS n FROM "Invoice" GROUP BY state`,
      this.prisma.$queryRaw<{ settled: string | null; inflight: string | null }[]>`
        SELECT
          coalesce(sum("displayAmount") FILTER (
            WHERE state = 'PAID_CONFIRMED' AND "displayCurrency" IN (${usd})), 0)::text AS settled,
          coalesce(sum("displayAmount") FILTER (
            WHERE state IN ('AWAITING_PAYMENT','RECEIVED','CONVERTING','PAYOUT_SENT')
              AND "displayCurrency" IN (${usd})), 0)::text AS inflight
        FROM "Invoice"`,
      this.prisma.subscription.count({ where: { status: "ACTIVE" } }),
      this.prisma.subscriptionPlan.count({ where: { active: true } }),
      this.prisma.$queryRaw<{ mrr: string | null }[]>`
        SELECT coalesce(sum(
          p."costPerPeriod" * CASE lower(p."periodUnit")
            WHEN 'day' THEN 30.0 / p."periodDuration"
            WHEN 'week' THEN 4.345 / p."periodDuration"
            WHEN 'month' THEN 1.0 / p."periodDuration"
            WHEN 'year' THEN 1.0 / (12 * p."periodDuration")
            ELSE 1.0 / p."periodDuration" END
        ), 0)::text AS mrr
        FROM "Subscription" s JOIN "SubscriptionPlan" p ON p.id = s."planId"
        WHERE s.status = 'ACTIVE' AND p.currency IN (${usd})`,
      this.prisma.unmatchedPayment.count({ where: { status: "open" } }),
      this.prisma.outboxEvent.count({ where: { status: "pending" } }),
      this.prisma.outboxEvent.count({ where: { status: "dead" } }),
      this.prisma.webhookDelivery.count({ where: { status: "FAILED" } }),
      // Matches the review queue: submitted OR uploaded-but-not-submitted.
      this.prisma.merchant.count({
        where: {
          kybStatus: { in: ["UNDER_REVIEW", "PENDING"] },
          kybDocuments: { some: {} },
        },
      }),
    ]);

    const mCount = (s: string) => Number(merchantRows.find((r) => r.status === s)?.n ?? 0);
    const iCount = (s: string) => Number(invoiceRows.find((r) => r.state === s)?.n ?? 0);

    const paid = iCount("PAID_CONFIRMED");
    const failed = iCount("FAILED");
    const expired = iCount("EXPIRED");
    const decided = paid + failed + expired;

    return {
      merchants: {
        total: merchantRows.reduce((a, r) => a + Number(r.n), 0),
        active: mCount("ACTIVE"),
        pending: mCount("PENDING"),
        suspended: mCount("SUSPENDED"),
      },
      invoices: {
        total: invoiceRows.reduce((a, r) => a + Number(r.n), 0),
        paid,
        awaiting: iCount("AWAITING_PAYMENT"),
        failed,
        expired,
      },
      subscriptions: {
        activeSubscribers: subs,
        plans,
        mrrUsd: this.round2(mrrRow[0]?.mrr ?? "0"),
      },
      volume: {
        settledUsd: this.round2(volumeRow[0]?.settled ?? "0"),
        inflightUsd: this.round2(volumeRow[0]?.inflight ?? "0"),
        conversionRate: decided === 0 ? 0 : Number((paid / decided).toFixed(4)),
      },
      operations: {
        unmatchedOpen,
        outboxPending,
        outboxDead,
        webhooksFailing,
        kybPending,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async timeseries(
    metric: AdminMetric,
    interval: AdminInterval,
    from: Date,
    to: Date,
  ): Promise<AdminTimeseriesDto> {
    if (!VALID_INTERVALS.includes(interval)) {
      throw new BadRequestException(`interval must be one of ${VALID_INTERVALS.join(", ")}`);
    }
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      throw new BadRequestException("Invalid from/to range");
    }
    const usd = Prisma.join(USD_CURRENCIES);
    // `interval` is validated against a whitelist above, so it is safe to bind
    // as date_trunc's text argument.
    const bucket = Prisma.sql`date_trunc(${interval}, "createdAt")`;

    let rows: { t: Date; value: string }[];
    switch (metric) {
      case "settled_volume":
        rows = await this.prisma.$queryRaw`
          SELECT ${bucket} AS t, coalesce(sum("displayAmount"), 0)::text AS value
          FROM "Invoice"
          WHERE state = 'PAID_CONFIRMED' AND "displayCurrency" IN (${usd})
            AND "createdAt" BETWEEN ${from} AND ${to}
          GROUP BY 1 ORDER BY 1`;
        break;
      case "invoices_paid":
        rows = await this.prisma.$queryRaw`
          SELECT ${bucket} AS t, count(*)::text AS value
          FROM "Invoice"
          WHERE state = 'PAID_CONFIRMED' AND "createdAt" BETWEEN ${from} AND ${to}
          GROUP BY 1 ORDER BY 1`;
        break;
      case "invoices_created":
        rows = await this.prisma.$queryRaw`
          SELECT ${bucket} AS t, count(*)::text AS value
          FROM "Invoice"
          WHERE "createdAt" BETWEEN ${from} AND ${to}
          GROUP BY 1 ORDER BY 1`;
        break;
      case "new_merchants":
        rows = await this.prisma.$queryRaw`
          SELECT ${bucket} AS t, count(*)::text AS value
          FROM "Merchant"
          WHERE "createdAt" BETWEEN ${from} AND ${to}
          GROUP BY 1 ORDER BY 1`;
        break;
      default:
        throw new BadRequestException(`Unknown metric ${metric}`);
    }

    return {
      metric,
      interval,
      points: rows.map((r) => ({ t: new Date(r.t).toISOString(), value: Number(r.value) })),
    };
  }

  async breakdown(): Promise<AdminBreakdownDto> {
    const usd = Prisma.join(USD_CURRENCIES);
    const [byState, byChain, topMerchants] = await Promise.all([
      this.prisma.$queryRaw<{ key: string; count: bigint; value: string }[]>`
        SELECT state::text AS key, count(*)::bigint AS count,
          coalesce(sum("displayAmount") FILTER (WHERE "displayCurrency" IN (${usd})), 0)::text AS value
        FROM "Invoice" GROUP BY state ORDER BY count DESC`,
      this.prisma.$queryRaw<{ key: string; count: bigint; value: string }[]>`
        SELECT "payChain" AS key, count(*)::bigint AS count,
          coalesce(sum("displayAmount") FILTER (
            WHERE state = 'PAID_CONFIRMED' AND "displayCurrency" IN (${usd})), 0)::text AS value
        FROM "Invoice" GROUP BY "payChain" ORDER BY count DESC`,
      this.prisma.$queryRaw<{ id: string; business: string; count: bigint; value: string }[]>`
        SELECT m.id, m.business, count(i.*)::bigint AS count,
          coalesce(sum(i."displayAmount") FILTER (
            WHERE i.state = 'PAID_CONFIRMED' AND i."displayCurrency" IN (${usd})), 0)::text AS value
        FROM "Merchant" m JOIN "Invoice" i ON i."merchantId" = m.id
        GROUP BY m.id, m.business ORDER BY value DESC, count DESC LIMIT 10`,
    ]);

    return {
      byState: byState.map((r) => ({
        key: r.key,
        label: this.humanState(r.key),
        count: Number(r.count),
        valueUsd: this.round2(r.value),
      })),
      byChain: byChain.map((r) => ({
        key: r.key,
        label: r.key,
        count: Number(r.count),
        valueUsd: this.round2(r.value),
      })),
      topMerchants: topMerchants.map((r) => ({
        merchantId: r.id,
        business: r.business,
        count: Number(r.count),
        valueUsd: this.round2(r.value),
      })),
    };
  }

  private round2(v: string): string {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(2) : "0.00";
  }

  private humanState(state: string): string {
    return state
      .toLowerCase()
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
}
