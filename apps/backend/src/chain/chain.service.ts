import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CHAIN_CONFIGS, Chain } from "@egofi/types";

const TATUM_BASE = "https://api.tatum.io/v3";

@Injectable()
export class ChainService {
  private readonly logger = new Logger(ChainService.name);
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = config.getOrThrow<string>("TATUM_API_KEY");
  }

  private async tatumFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${TATUM_BASE}${path}`, {
      ...options,
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json",
        ...options?.headers,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Tatum API ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
  }

  async subscribeAddress(chain: string, address: string, webhookUrl: string): Promise<string> {
    const tatumChain = this.toTatumChain(chain);
    const data = await this.tatumFetch<{ id: string }>("/subscription", {
      method: "POST",
      body: JSON.stringify({
        type: "ADDRESS_TRANSACTION",
        attr: { address, chain: tatumChain, url: webhookUrl },
      }),
    });
    return data.id;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    await this.tatumFetch(`/subscription/${subscriptionId}`, { method: "DELETE" });
  }

  async getTxConfirmations(chain: string, txHash: string): Promise<number> {
    const config = CHAIN_CONFIGS[chain as Chain];
    if (!config) return 0;

    try {
      const tatumChain = this.toTatumChain(chain);
      const data = await this.tatumFetch<{ confirmations?: number }>(
        `/${tatumChain.toLowerCase()}/transaction/${txHash}`,
      );
      return data.confirmations ?? 0;
    } catch (err) {
      this.logger.warn({ err, chain, txHash }, "Could not fetch tx confirmations");
      return 0;
    }
  }

  getRequiredConfirmations(chain: string): number {
    return CHAIN_CONFIGS[chain as Chain]?.confirmationsRequired ?? 12;
  }

  private toTatumChain(chain: string): string {
    const map: Record<string, string> = {
      ETHEREUM: "ETH",
      BSC: "BSC",
      POLYGON: "MATIC",
      BASE: "BASE",
      TRON: "TRON",
      SOLANA: "SOL",
      BITCOIN: "BTC",
    };
    return map[chain.toUpperCase()] ?? chain;
  }
}
