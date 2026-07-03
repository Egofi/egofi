import { Inject, Injectable, BadRequestException } from "@nestjs/common";
import Decimal from "decimal.js";
import type { SettlementRail, RouteQuery } from "./rail.interface";
import { SETTLEMENT_RAIL_TOKEN } from "./rail.interface";
import { RailType } from "@egofi/types";

const SWAP_MINIMUM_USD = 20;

// Instant-swap providers concentrate AML holds on larger tickets (§10.3);
// above this band we steer to DirectTransferRail instead. Tune from observed
// freeze data. Never split a payment to duck this — that is structuring (§7).
const SWAP_AML_ATTENTION_USD = 1_500;

export type RouteDecision = {
  rail: SettlementRail;
  /** Populated when the router steered away from the requested route (§7 rule 3). */
  steeringNote?: string;
};

@Injectable()
export class RailRouter {
  constructor(
    @Inject(SETTLEMENT_RAIL_TOKEN) private readonly rails: SettlementRail[],
  ) {}

  select(query: RouteQuery): SettlementRail {
    return this.route(query).rail;
  }

  route(query: RouteQuery): RouteDecision {
    // A payment needs no conversion when the customer's asset and the
    // merchant's settlement asset are the same token on the same chain. Assets
    // are named inconsistently across the system ("USDT" vs "USDT-TRC20"), so
    // compare the normalized base symbol, not the raw string.
    const isDirectRoute =
      normalizeSymbol(query.fromAsset) === normalizeSymbol(query.toAsset) &&
      query.fromChain === query.toChain;

    // Rule 1: same asset + same chain → DirectTransferRail
    if (isDirectRoute) {
      const direct = this.findByType(RailType.DirectTransfer);
      if (direct.supports(query)) return { rail: direct };
    }

    const amountUsd = this.estimateUsd(query.amountBaseUnits, query.fromAsset);

    // Rule 2: below swap minimum → DirectTransferRail if supported, else reject
    if (!isDirectRoute && amountUsd < SWAP_MINIMUM_USD) {
      const direct = this.findByType(RailType.DirectTransfer);
      if (direct.supports(query)) {
        return {
          rail: direct,
          steeringNote: `Amount is below the $${SWAP_MINIMUM_USD} conversion minimum; the merchant will receive ${query.fromAsset} as-is.`,
        };
      }
      throw new BadRequestException(
        `Minimum amount for cross-token conversion is $${SWAP_MINIMUM_USD} USD equivalent`,
      );
    }

    // Rule 3: above the provider AML-attention band → steer away from
    // SwapProviderRail. Large tickets are where instant-swap AML holds
    // concentrate; offer DirectTransferRail and tell the customer why.
    if (!isDirectRoute && amountUsd >= SWAP_AML_ATTENTION_USD) {
      const direct = this.findByType(RailType.DirectTransfer);
      if (direct.supports(query)) {
        return {
          rail: direct,
          steeringNote:
            `Payments above $${SWAP_AML_ATTENTION_USD} are routed as a direct transfer to avoid ` +
            `third-party compliance delays; the merchant will receive ${query.fromAsset} as-is.`,
        };
      }
      // No direct alternative — swap is allowed, but flagged for ops visibility.
      const swap = this.findByType(RailType.SwapProvider);
      if (swap.supports(query)) {
        return {
          rail: swap,
          steeringNote: `Large ticket ($${amountUsd.toFixed(0)}) routed through a swap provider; conversion may require identity verification by the provider.`,
        };
      }
    }

    // Rule 4: cross-token / cross-chain → SwapProviderRail
    if (!isDirectRoute) {
      const swap = this.findByType(RailType.SwapProvider);
      if (swap.supports(query)) return { rail: swap };
    }

    throw new BadRequestException(
      `No available rail for route ${query.fromAsset}@${query.fromChain} → ${query.toAsset}@${query.toChain}`,
    );
  }

  private findByType(type: RailType): SettlementRail {
    const rail = this.rails.find((r) => r.railType === type);
    if (!rail) {
      throw new BadRequestException(`Rail ${type} not registered`);
    }
    return rail;
  }

  private estimateUsd(amountBaseUnits: bigint, asset: string): number {
    // For stablecoins priced at ~$1, base-unit-amount / 1e6 gives USD equivalent
    const stablecoins = ["USDT", "USDC", "BUSD", "DAI"];
    const isStable = stablecoins.some((s) => asset.toUpperCase().includes(s));
    if (isStable) {
      return Number(new Decimal(amountBaseUnits.toString()).div(1e6));
    }
    // Volatile assets: conservative estimate; pricing module should be used for accuracy
    return Number(new Decimal(amountBaseUnits.toString()).div(1e8));
  }
}

/**
 * Reduces an asset label to its base token symbol so equivalent names compare
 * equal: "USDT-TRC20" → "USDT", "USDC-SOL" → "USDC", "usdt" → "USDT".
 */
function normalizeSymbol(asset: string): string {
  const parts = asset.toUpperCase().split("-");
  return parts[0] ?? asset.toUpperCase();
}
