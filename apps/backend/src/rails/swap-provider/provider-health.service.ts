import type { SwapProvider } from "@egofi/types";
import { Injectable, Logger } from "@nestjs/common";
import Decimal from "decimal.js";
import type { PrismaService } from "../../core/prisma.service";

const LOOKBACK_HOURS = 24;
// A provider whose recent success rate drops below this is demoted behind
// its fallback (§10.3: treat providers as monitored counterparties).
const DEMOTION_SUCCESS_RATE = 0.9;
const MIN_SAMPLE_SIZE = 5;

export type ProviderHealth = {
  provider: string;
  successRate: number;
  freezeRate: number;
  medianSettleMs: number;
  quotedVsDeliveredDriftPct: number;
  sampleSize: number;
};

/**
 * Provider health scoring (§8 provider-health, §10.3): per-provider success
 * rate, freeze rate, settle latency, and quoted-vs-delivered drift computed
 * from ProviderTransaction rows. Failover is automatic — the rail asks this
 * service for provider ordering instead of using static config.
 */
@Injectable()
export class ProviderHealthService {
  private readonly logger = new Logger(ProviderHealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async computeHealth(provider: string): Promise<ProviderHealth> {
    const since = new Date(Date.now() - LOOKBACK_HOURS * 3_600_000);
    const txs = await this.prisma.providerTransaction.findMany({
      where: { provider, createdAt: { gte: since } },
      select: {
        status: true,
        quotedOut: true,
        deliveredOut: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const sampleSize = txs.length;
    if (sampleSize === 0) {
      return {
        provider,
        successRate: 1,
        freezeRate: 0,
        medianSettleMs: 0,
        quotedVsDeliveredDriftPct: 0,
        sampleSize: 0,
      };
    }

    const finished = txs.filter((t) => t.status === "finished");
    const frozen = txs.filter((t) => t.status === "verifying");
    const failed = txs.filter((t) => t.status === "failed" || t.status === "refunded");
    const settled = finished.length + failed.length;

    const settleTimes = finished
      .map((t) => t.updatedAt.getTime() - t.createdAt.getTime())
      .sort((a, b) => a - b);
    const medianSettleMs = settleTimes[Math.floor(settleTimes.length / 2)] ?? 0;

    const drifts = finished
      .filter((t) => t.deliveredOut !== null)
      .map((t) => {
        const quoted = new Decimal(t.quotedOut.toString());
        if (quoted.isZero()) return 0;
        return new Decimal(t.deliveredOut?.toString() ?? "0")
          .minus(quoted)
          .div(quoted)
          .abs()
          .mul(100)
          .toNumber();
      });
    const meanDrift = drifts.length > 0 ? drifts.reduce((a, b) => a + b, 0) / drifts.length : 0;

    return {
      provider,
      successRate: settled > 0 ? finished.length / settled : 1,
      freezeRate: frozen.length / sampleSize,
      medianSettleMs,
      quotedVsDeliveredDriftPct: meanDrift,
      sampleSize,
    };
  }

  /**
   * Orders providers for the rail's failover loop: healthy providers keep
   * their configured priority; a degraded provider is pushed to the back.
   */
  async rankProviders(providers: SwapProvider[]): Promise<SwapProvider[]> {
    const healths = await Promise.all(providers.map((p) => this.computeHealth(p.name)));
    const byName = new Map(healths.map((h) => [h.provider, h]));

    const healthy: SwapProvider[] = [];
    const degraded: SwapProvider[] = [];
    for (const provider of providers) {
      const health = byName.get(provider.name);
      const isDegraded =
        health !== undefined &&
        health.sampleSize >= MIN_SAMPLE_SIZE &&
        health.successRate < DEMOTION_SUCCESS_RATE;
      if (isDegraded) {
        this.logger.warn({ provider: provider.name, health }, "provider demoted by health score");
        degraded.push(provider);
      } else {
        healthy.push(provider);
      }
    }
    return [...healthy, ...degraded];
  }

  /** Hourly rollup persisted for trend dashboards (provider-health queue). */
  async snapshot(providers: string[]): Promise<void> {
    for (const provider of providers) {
      const health = await this.computeHealth(provider);
      await this.prisma.providerHealthSnapshot.create({
        data: {
          provider,
          successRate: health.successRate,
          freezeRate: health.freezeRate,
          medianSettleMs: health.medianSettleMs,
          quotedVsDelivered: health.quotedVsDeliveredDriftPct,
          sampleSize: health.sampleSize,
        },
      });
    }
  }
}
