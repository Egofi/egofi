import type { SwapExchange, SwapProvider, SwapQuote, SwapStatusResponse } from "@egofi/types";
import { RateType, SwapProviderName } from "@egofi/types";
import { Injectable, Logger } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";

const BASE_URL = "https://api.simpleswap.io";

@Injectable()
export class SimpleSwapAdapter implements SwapProvider {
  readonly name = SwapProviderName.SimpleSwap;
  private readonly logger = new Logger(SimpleSwapAdapter.name);
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = config.getOrThrow<string>("SIMPLESWAP_API_KEY");
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const separator = path.includes("?") ? "&" : "?";
    const url = `${BASE_URL}${path}${separator}api_key=${this.apiKey}`;
    const res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...options?.headers },
    });
    if (!res.ok) {
      const body = await res.text();
      this.logger.error({ status: res.status, body, path }, "SimpleSwap API error");
      throw new Error(`SimpleSwap API error ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
  }

  async getMinAmount(fromAsset: string, toAsset: string): Promise<string> {
    const data = await this.fetch<{ min: string }>(
      `/get_ranges?fixed=false&currency_from=${fromAsset.toLowerCase()}&currency_to=${toAsset.toLowerCase()}`,
    );
    return data.min;
  }

  async getQuote(params: {
    fromAsset: string;
    fromChain: string;
    toAsset: string;
    toChain: string;
    amount: string;
    rateType: RateType;
  }): Promise<SwapQuote> {
    const fixed = params.rateType === RateType.Fixed ? "true" : "false";
    const data = await this.fetch<{ estimated_amount: string }>(
      `/get_estimated?fixed=${fixed}&currency_from=${params.fromAsset.toLowerCase()}&currency_to=${params.toAsset.toLowerCase()}&amount=${params.amount}`,
    );
    const minAmount = await this.getMinAmount(params.fromAsset, params.toAsset);

    return {
      provider: SwapProviderName.SimpleSwap,
      fromAsset: params.fromAsset,
      fromChain: params.fromChain,
      toAsset: params.toAsset,
      toChain: params.toChain,
      fromAmount: params.amount,
      toAmount: data.estimated_amount,
      rate: (
        Number.parseFloat(data.estimated_amount) / Number.parseFloat(params.amount)
      ).toString(),
      rateType: params.rateType,
      minAmount,
      estimatedDurationSeconds: 1200,
      validUntil: new Date(Date.now() + 15 * 60_000).toISOString(),
    };
  }

  async createExchange(params: {
    fromAsset: string;
    toAsset: string;
    amount: string;
    toAddress: string;
    refundAddress: string;
    rateType: RateType;
  }): Promise<SwapExchange> {
    const body = {
      fixed: params.rateType === RateType.Fixed,
      currency_from: params.fromAsset.toLowerCase(),
      currency_to: params.toAsset.toLowerCase(),
      amount: params.amount,
      address_to: params.toAddress,
      user_refund_address: params.refundAddress,
    };

    const data = await this.fetch<{
      id: string;
      address_from: string;
      amount_from: string;
      amount_to: string;
      valid_until: string;
    }>("/create_exchange", { method: "POST", body: JSON.stringify(body) });

    return {
      id: data.id,
      provider: SwapProviderName.SimpleSwap,
      depositAddress: data.address_from,
      depositAmount: data.amount_from,
      fromAsset: params.fromAsset,
      toAmount: data.amount_to,
      toAsset: params.toAsset,
      toAddress: params.toAddress,
      refundAddress: params.refundAddress,
      rateType: params.rateType,
      validUntil: data.valid_until,
    };
  }

  async getStatus(exchangeId: string): Promise<SwapStatusResponse> {
    const data = await this.fetch<{
      status: string;
      tx_from?: string;
      tx_to?: string;
      updated_at: string;
    }>(`/get_exchange?id=${exchangeId}`);

    const statusMap: Record<string, SwapStatusResponse["status"]> = {
      waiting: "waiting",
      confirming: "confirming",
      exchanging: "exchanging",
      sending: "sending",
      finished: "finished",
      failed: "failed",
      refunded: "refunded",
    };

    return {
      id: exchangeId,
      provider: SwapProviderName.SimpleSwap,
      status: statusMap[data.status] ?? "waiting",
      ...(data.tx_from ? { depositTxHash: data.tx_from } : {}),
      ...(data.tx_to ? { payoutTxHash: data.tx_to } : {}),
      updatedAt: data.updated_at,
    };
  }
}
