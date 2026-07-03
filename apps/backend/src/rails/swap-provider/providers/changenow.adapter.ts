import type { SwapExchange, SwapProvider, SwapQuote, SwapStatusResponse } from "@egofi/types";
import { RateType, SwapProviderName } from "@egofi/types";
import { Injectable, Logger } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";

const BASE_URL = "https://api.changenow.io/v2";

@Injectable()
export class ChangeNowAdapter implements SwapProvider {
  readonly name = SwapProviderName.ChangeNOW;
  private readonly logger = new Logger(ChangeNowAdapter.name);
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = config.getOrThrow<string>("CHANGENOW_API_KEY");
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        "x-changenow-api-key": this.apiKey,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
    if (!res.ok) {
      const body = await res.text();
      this.logger.error({ status: res.status, body, path }, "ChangeNOW API error");
      throw new Error(`ChangeNOW API error ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
  }

  async getMinAmount(fromAsset: string, toAsset: string): Promise<string> {
    const data = await this.fetch<{ minAmount: number }>(
      `/exchange/min-amount?fromCurrency=${fromAsset}&toCurrency=${toAsset}&flow=fixed-rate`,
    );
    return data.minAmount.toString();
  }

  async getQuote(params: {
    fromAsset: string;
    fromChain: string;
    toAsset: string;
    toChain: string;
    amount: string;
    rateType: RateType;
  }): Promise<SwapQuote> {
    const flow = params.rateType === RateType.Fixed ? "fixed-rate" : "standard";
    const data = await this.fetch<{
      estimatedAmount: number;
      rate: number;
      transactionSpeedForecast: string;
      validUntil: string;
    }>(
      `/exchange/estimated-amount?fromCurrency=${params.fromAsset}&toCurrency=${params.toAsset}&fromAmount=${params.amount}&flow=${flow}`,
    );

    const minAmount = await this.getMinAmount(params.fromAsset, params.toAsset);

    return {
      provider: SwapProviderName.ChangeNOW,
      fromAsset: params.fromAsset,
      fromChain: params.fromChain,
      toAsset: params.toAsset,
      toChain: params.toChain,
      fromAmount: params.amount,
      toAmount: data.estimatedAmount.toString(),
      rate: data.rate.toString(),
      rateType: params.rateType,
      minAmount,
      estimatedDurationSeconds: Number.parseInt(data.transactionSpeedForecast, 10) * 60,
      validUntil: data.validUntil ?? new Date(Date.now() + 15 * 60_000).toISOString(),
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
    const flow = params.rateType === RateType.Fixed ? "fixed-rate" : "standard";
    const body = {
      fromCurrency: params.fromAsset,
      toCurrency: params.toAsset,
      fromAmount: params.amount,
      address: params.toAddress,
      refundAddress: params.refundAddress,
      flow,
    };

    const data = await this.fetch<{
      id: string;
      payinAddress: string;
      expectedAmountFrom: number;
      expectedAmountTo: number;
      validUntil: string;
    }>("/exchange", { method: "POST", body: JSON.stringify(body) });

    return {
      id: data.id,
      provider: SwapProviderName.ChangeNOW,
      depositAddress: data.payinAddress,
      depositAmount: data.expectedAmountFrom.toString(),
      fromAsset: params.fromAsset,
      toAmount: data.expectedAmountTo.toString(),
      toAsset: params.toAsset,
      toAddress: params.toAddress,
      refundAddress: params.refundAddress,
      rateType: params.rateType,
      validUntil: data.validUntil,
    };
  }

  async getStatus(exchangeId: string): Promise<SwapStatusResponse> {
    const data = await this.fetch<{
      status: string;
      payinHash?: string;
      payoutHash?: string;
      updatedAt: string;
    }>(`/exchange/by-id?id=${exchangeId}`);

    const statusMap: Record<string, SwapStatusResponse["status"]> = {
      waiting: "waiting",
      confirming: "confirming",
      exchanging: "exchanging",
      sending: "sending",
      finished: "finished",
      failed: "failed",
      refunded: "refunded",
      verifying: "verifying",
    };

    return {
      id: exchangeId,
      provider: SwapProviderName.ChangeNOW,
      status: statusMap[data.status] ?? "waiting",
      ...(data.payinHash ? { depositTxHash: data.payinHash } : {}),
      ...(data.payoutHash ? { payoutTxHash: data.payoutHash } : {}),
      updatedAt: data.updatedAt,
    };
  }
}
