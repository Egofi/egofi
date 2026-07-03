import type { RateType, SwapProviderName } from "./enums.js";

export interface SwapQuote {
  provider: SwapProviderName;
  fromAsset: string;
  fromChain: string;
  toAsset: string;
  toChain: string;
  fromAmount: string;
  toAmount: string;
  rate: string;
  rateType: RateType;
  minAmount: string;
  maxAmount?: string;
  estimatedDurationSeconds: number;
  validUntil: string;
}

export interface SwapExchange {
  id: string;
  provider: SwapProviderName;
  depositAddress: string;
  depositAmount: string;
  fromAsset: string;
  toAmount: string;
  toAsset: string;
  toAddress: string;
  refundAddress: string;
  rateType: RateType;
  validUntil: string;
}

export type SwapStatus =
  | "waiting"
  | "confirming"
  | "exchanging"
  | "sending"
  | "finished"
  | "failed"
  | "refunded"
  | "verifying";

export interface SwapStatusResponse {
  id: string;
  provider: SwapProviderName;
  status: SwapStatus;
  depositTxHash?: string;
  payoutTxHash?: string;
  updatedAt: string;
}

export interface SwapProvider {
  readonly name: SwapProviderName;
  getMinAmount(fromAsset: string, toAsset: string): Promise<string>;
  getQuote(params: {
    fromAsset: string;
    fromChain: string;
    toAsset: string;
    toChain: string;
    amount: string;
    rateType: RateType;
  }): Promise<SwapQuote>;
  createExchange(params: {
    fromAsset: string;
    toAsset: string;
    amount: string;
    toAddress: string;
    refundAddress: string;
    rateType: RateType;
  }): Promise<SwapExchange>;
  getStatus(exchangeId: string): Promise<SwapStatusResponse>;
}
