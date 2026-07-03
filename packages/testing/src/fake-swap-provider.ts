import { RateType, SwapProviderName } from "@egofi/types";
import type {
  SwapExchange,
  SwapProvider,
  SwapQuote,
  SwapStatus,
  SwapStatusResponse,
} from "@egofi/types";

/**
 * In-memory SwapProvider for unit/integration tests: deterministic ids,
 * scriptable status sequences (drive a swap through waiting → finished, or
 * park it in "verifying" to exercise the COMPLIANCE_HOLD branch).
 */
export class FakeSwapProvider implements SwapProvider {
  readonly name: SwapProviderName;
  private readonly exchanges = new Map<string, SwapExchange>();
  private readonly statuses = new Map<string, SwapStatus>();
  private counter = 0;

  /** Set to make createExchange throw — exercises the failover loop. */
  failNextCreate = false;
  minAmount = "10";

  constructor(name: SwapProviderName = SwapProviderName.ChangeNOW) {
    this.name = name;
  }

  async getMinAmount(): Promise<string> {
    return this.minAmount;
  }

  async getQuote(params: {
    fromAsset: string;
    fromChain: string;
    toAsset: string;
    toChain: string;
    amount: string;
    rateType: RateType;
  }): Promise<SwapQuote> {
    return {
      provider: this.name,
      fromAsset: params.fromAsset,
      fromChain: params.fromChain,
      toAsset: params.toAsset,
      toChain: params.toChain,
      fromAmount: params.amount,
      toAmount: params.amount, // 1:1 fake rate
      rate: "1",
      rateType: params.rateType,
      minAmount: this.minAmount,
      estimatedDurationSeconds: 300,
      validUntil: new Date(Date.now() + 10 * 60_000).toISOString(),
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
    if (this.failNextCreate) {
      this.failNextCreate = false;
      throw new Error(`${this.name} createExchange failed (scripted)`);
    }
    const id = `${this.name.toLowerCase()}_ex_${++this.counter}`;
    const exchange: SwapExchange = {
      id,
      provider: this.name,
      depositAddress: `fake_deposit_${id}`,
      depositAmount: params.amount,
      fromAsset: params.fromAsset,
      toAmount: params.amount,
      toAsset: params.toAsset,
      toAddress: params.toAddress,
      refundAddress: params.refundAddress,
      rateType: params.rateType,
      validUntil: new Date(Date.now() + 10 * 60_000).toISOString(),
    };
    this.exchanges.set(id, exchange);
    this.statuses.set(id, "waiting");
    return exchange;
  }

  async getStatus(exchangeId: string): Promise<SwapStatusResponse> {
    const status = this.statuses.get(exchangeId);
    if (!status) throw new Error(`Unknown exchange ${exchangeId}`);
    return {
      id: exchangeId,
      provider: this.name,
      status,
      updatedAt: new Date().toISOString(),
    };
  }

  /** Test hook: script the provider-side status. */
  setStatus(exchangeId: string, status: SwapStatus): void {
    this.statuses.set(exchangeId, status);
  }
}
