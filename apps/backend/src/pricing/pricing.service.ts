import { Injectable, Logger } from "@nestjs/common";
import Decimal from "decimal.js";
import { RedisService } from "../core/redis.service";

const RATE_CACHE_TTL = 60; // seconds
const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

const ASSET_ID_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  TRX: "tron",
  POL: "matic-network",
  "USDT-TRC20": "tether",
  "USDT-BEP20": "tether",
  "USDC-SOL": "usd-coin",
  USDT: "tether",
  USDC: "usd-coin",
};

interface RateQuote {
  quotedAmount: string;
  rate: string;
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(private readonly redis: RedisService) {}

  async getQuote(fromAsset: string, toCurrency: string, displayAmount: string): Promise<RateQuote> {
    const rate = await this.getRate(fromAsset, toCurrency);
    const quotedAmount = new Decimal(displayAmount).div(rate).toFixed(6);
    return { quotedAmount, rate: rate.toString() };
  }

  async getRate(asset: string, currency: string): Promise<Decimal> {
    const cacheKey = `rate:${asset}:${currency}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return new Decimal(cached);

    const coinId = ASSET_ID_MAP[asset.toUpperCase()] ?? asset.toLowerCase();
    const vs = currency.toLowerCase();

    try {
      const res = await fetch(`${COINGECKO_BASE}/simple/price?ids=${coinId}&vs_currencies=${vs}`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);

      const data = (await res.json()) as Record<string, Record<string, number>>;
      const price = data[coinId]?.[vs];
      if (!price) throw new Error(`No price for ${coinId} in ${vs}`);

      const decimal = new Decimal(price);
      await this.redis.setex(cacheKey, RATE_CACHE_TTL, decimal.toString());
      return decimal;
    } catch (err) {
      this.logger.error({ err, asset, currency }, "CoinGecko rate fetch failed");
      // Fallback: return 1:1 for stablecoins
      if (asset.toUpperCase().includes("USDT") || asset.toUpperCase().includes("USDC")) {
        return new Decimal(1);
      }
      throw err;
    }
  }
}
