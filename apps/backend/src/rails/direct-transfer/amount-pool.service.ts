import { ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../core/prisma.service";
import { RedisService } from "../../core/redis.service";

const STEP_UNITS = 100n; // 0.0001 in 6-decimal stablecoins
const LOCK_TTL_MS = 30_000;

@Injectable()
export class AmountPoolService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Allocate the smallest unused base-unit increment for the given
   * (address, asset, chain) tuple within the invoice window.
   * Uses a Redis lock to prevent concurrent race on the same slot.
   */
  async allocate(params: {
    invoiceId: string;
    address: string;
    asset: string;
    chain: string;
    nominalAmount: bigint;
    expiresAt: Date;
    cooldownMs?: number;
  }): Promise<bigint> {
    const lockKey = `amount-pool:lock:${params.address}:${params.asset}:${params.chain}`;
    const acquired = await this.redis.set(lockKey, "1", "PX", LOCK_TTL_MS, "NX");
    if (!acquired) {
      throw new ConflictException("Amount pool temporarily unavailable; retry");
    }

    try {
      const existing = await this.prisma.amountReservation.findMany({
        where: {
          address: params.address,
          asset: params.asset,
          chain: params.chain,
          expiresAt: { gt: new Date() },
        },
        select: { amountBaseUnits: true },
      });

      const reserved = new Set(existing.map((r) => r.amountBaseUnits));

      let candidate = params.nominalAmount;
      while (reserved.has(candidate.toString())) {
        candidate += STEP_UNITS;
      }

      const cooldownUntil = params.cooldownMs
        ? new Date(params.expiresAt.getTime() + params.cooldownMs)
        : undefined;

      await this.prisma.amountReservation.create({
        data: {
          invoiceId: params.invoiceId,
          address: params.address,
          asset: params.asset,
          chain: params.chain,
          amountBaseUnits: candidate.toString(),
          expiresAt: params.expiresAt,
          cooldownUntil: cooldownUntil ?? null,
        },
      });

      return candidate;
    } finally {
      await this.redis.del(lockKey);
    }
  }

  /**
   * Find the invoice for an incoming deposit by matching
   * (address, asset, chain, exact-amount) within the active window — OR the
   * cooldown window (§10.1): the amount stays reserved ~2× the window after
   * expiry so a late straggler still attributes correctly.
   */
  async matchDeposit(params: {
    address: string;
    asset: string;
    chain: string;
    amountBaseUnits: bigint;
  }): Promise<string | null> {
    const now = new Date();
    const reservation = await this.prisma.amountReservation.findFirst({
      where: {
        address: params.address,
        asset: params.asset,
        chain: params.chain,
        amountBaseUnits: params.amountBaseUnits.toString(),
        OR: [{ expiresAt: { gt: now } }, { cooldownUntil: { gt: now } }],
      },
      select: { invoiceId: true },
    });
    return reservation?.invoiceId ?? null;
  }

  /**
   * Nearest-invoice suggestions for an unmatched deposit — same address/asset
   * with a close-but-not-exact amount (typical exchange fee-netting cases).
   */
  async findCandidates(params: {
    address: string;
    asset: string;
    chain: string;
    amountBaseUnits: bigint;
  }): Promise<Array<{ invoiceId: string; expectedBaseUnits: string }>> {
    const rows = await this.prisma.amountReservation.findMany({
      where: {
        address: params.address,
        asset: params.asset,
        chain: params.chain,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { invoiceId: true, amountBaseUnits: true },
    });
    const target = params.amountBaseUnits;
    return rows
      .map((r) => ({
        invoiceId: r.invoiceId,
        expectedBaseUnits: r.amountBaseUnits,
        distance:
          BigInt(r.amountBaseUnits) > target
            ? BigInt(r.amountBaseUnits) - target
            : target - BigInt(r.amountBaseUnits),
      }))
      .sort((a, b) => (a.distance < b.distance ? -1 : 1))
      .slice(0, 3)
      .map(({ invoiceId, expectedBaseUnits }) => ({ invoiceId, expectedBaseUnits }));
  }

  async release(invoiceId: string): Promise<void> {
    await this.prisma.amountReservation.deleteMany({ where: { invoiceId } });
  }
}
