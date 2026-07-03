import { RailStatus, RailType, RateType } from "@egofi/types";
import type { SwapProvider } from "@egofi/types";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import type { PrismaService } from "../../core/prisma.service";
import type { Invoice, PaymentInstructions, RailEvent, RouteQuery } from "../rail.interface";
import type { SettlementRail } from "../rail.interface";
import type { ProviderHealthService } from "./provider-health.service";
import type { ChangeNowAdapter } from "./providers/changenow.adapter";
import type { SimpleSwapAdapter } from "./providers/simpleswap.adapter";

@Injectable()
export class SwapProviderRail implements SettlementRail {
  readonly railType = RailType.SwapProvider;
  private readonly logger = new Logger(SwapProviderRail.name);

  private readonly providers: SwapProvider[];

  constructor(
    private readonly changeNow: ChangeNowAdapter,
    private readonly simpleSwap: SimpleSwapAdapter,
    private readonly prisma: PrismaService,
    private readonly providerHealth: ProviderHealthService,
  ) {
    // Configured priority: primary first, fallback second. Health scoring
    // may reorder this at createPayment time (§10.3 automatic failover).
    this.providers = [this.changeNow, this.simpleSwap];
  }

  supports(_query: RouteQuery): boolean {
    // SwapProviderRail can handle any cross-token or cross-chain route
    return true;
  }

  async createPayment(invoice: Invoice): Promise<PaymentInstructions> {
    const merchant = await this.prisma.merchant.findUniqueOrThrow({
      where: { id: invoice.merchantId },
    });

    const settlementAddr =
      (merchant.settlementAddresses as Record<string, string>)["tron"] ??
      Object.values(merchant.settlementAddresses as Record<string, string>)[0];
    if (!settlementAddr) throw new BadRequestException("Merchant settlement address not set");

    const fromAmount = invoice.quotedAmount.toString();

    let exchange: Awaited<ReturnType<SwapProvider["createExchange"]>> | null = null;
    let lastError: unknown;

    // Health scoring reorders providers: a degraded provider (freeze-rate
    // spike, failing swaps) is automatically demoted behind its fallback.
    const rankedProviders = await this.providerHealth.rankProviders(this.providers);

    for (const provider of rankedProviders) {
      try {
        const minAmount = await provider.getMinAmount(invoice.payAsset, merchant.settlementAsset);
        if (Number.parseFloat(fromAmount) < Number.parseFloat(minAmount)) {
          throw new BadRequestException(
            `Amount below ${provider.name} minimum of ${minAmount} ${invoice.payAsset}`,
          );
        }

        const candidate = await provider.createExchange({
          fromAsset: invoice.payAsset,
          toAsset: merchant.settlementAsset,
          amount: fromAmount,
          toAddress: settlementAddr,
          refundAddress: invoice.refundAddress ?? "",
          rateType: RateType.Fixed,
        });

        // Checkout-integrity control (§14): the classic gateway attack is
        // deposit-address substitution. Cross-verify the provider-returned
        // payout address equals the merchant's configured settlement address
        // on EVERY createExchange response, and alarm on mismatch.
        if (candidate.toAddress !== settlementAddr) {
          this.logger.error(
            {
              provider: provider.name,
              exchangeId: candidate.id,
              expected: settlementAddr,
              received: candidate.toAddress,
              invoiceId: invoice.id,
            },
            "SECURITY: provider payout address mismatch — possible address substitution",
          );
          throw new BadRequestException(
            "Provider returned an unexpected payout address; exchange rejected",
          );
        }

        exchange = candidate;
        this.logger.log(
          { provider: provider.name, exchangeId: exchange.id },
          "Swap exchange created",
        );

        // Persist the provider-side mirror + quote for daily reconciliation
        // and quote-race handling (§13).
        await this.prisma.providerTransaction.create({
          data: {
            invoiceId: invoice.id,
            provider: provider.name,
            providerTxId: exchange.id,
            status: "waiting",
            quotedOut: exchange.toAmount,
            raw: JSON.parse(JSON.stringify(exchange)),
          },
        });
        await this.prisma.quote.create({
          data: {
            invoiceId: invoice.id,
            provider: provider.name,
            fromAsset: invoice.payAsset,
            toAsset: merchant.settlementAsset,
            rate:
              Number.parseFloat(fromAmount) > 0
                ? (Number.parseFloat(exchange.toAmount) / Number.parseFloat(fromAmount)).toString()
                : "0",
            providerRef: exchange.id,
            validUntil: new Date(exchange.validUntil),
          },
        });
        break;
      } catch (err) {
        this.logger.warn(
          { provider: (provider as SwapProvider).name, err },
          "Swap provider failed; trying fallback",
        );
        lastError = err;
      }
    }

    if (!exchange) {
      throw lastError ?? new BadRequestException("All swap providers failed");
    }

    return {
      invoiceId: invoice.id,
      rail: RailType.SwapProvider,
      depositAddress: exchange.depositAddress,
      exactAmount: BigInt(Math.round(Number.parseFloat(exchange.depositAmount) * 1e6)),
      asset: invoice.payAsset,
      chain: invoice.payChain,
      expiresAt: new Date(exchange.validUntil),
      paymentUri: `${invoice.payChain.toLowerCase()}:${exchange.depositAddress}?amount=${exchange.depositAmount}`,
      qrData: exchange.depositAddress,
      providerRef: exchange.id,
    };
  }

  async getStatus(paymentRef: string): Promise<RailStatus> {
    for (const provider of this.providers) {
      try {
        const status = await provider.getStatus(paymentRef);
        return this.mapStatus(status.status);
      } catch {}
    }
    return RailStatus.Awaiting;
  }

  async handleWebhook(payload: unknown): Promise<RailEvent> {
    const event = payload as {
      status: string;
      id: string;
      payoutHash?: string;
      payinHash?: string;
      verificationUrl?: string;
    };

    // Provider AML/KYC freeze (§10.3) — surfaces as a first-class
    // COMPLIANCE_HOLD, never a flavor of FAILED. The verification link is
    // forwarded to customer + merchant notifications.
    if (event.status === "verifying") {
      return {
        type: "COMPLIANCE_HOLD",
        providerRef: event.id,
        ...(event.verificationUrl ? { verificationUrl: event.verificationUrl } : {}),
      };
    }
    if (event.status === "finished" && event.payoutHash) {
      return { type: "PAYOUT_CONFIRMED", txHash: event.payoutHash, confirmations: 1 };
    }
    if (event.status === "sending" && event.payoutHash) {
      return { type: "PAYOUT_SENT", txHash: event.payoutHash, amount: 0n, asset: "" };
    }
    if (event.status === "exchanging") {
      return { type: "CONVERSION_STARTED", providerRef: event.id };
    }
    if (event.status === "confirming" && event.payinHash) {
      return {
        type: "DEPOSIT_DETECTED",
        txHash: event.payinHash,
        amount: 0n,
        asset: "",
        chain: "",
      };
    }
    if (event.status === "failed") {
      return { type: "FAILED", reason: "Provider marked exchange as failed" };
    }
    if (event.status === "refunded") {
      return { type: "REFUNDED", txHash: event.payinHash ?? "" };
    }

    return { type: "DEPOSIT_DETECTED", txHash: "", amount: 0n, asset: "", chain: "" };
  }

  private mapStatus(status: string): RailStatus {
    const map: Record<string, RailStatus> = {
      waiting: RailStatus.Awaiting,
      confirming: RailStatus.Received,
      exchanging: RailStatus.Converting,
      sending: RailStatus.PayoutSent,
      finished: RailStatus.Settled,
      failed: RailStatus.Failed,
      refunded: RailStatus.Refunded,
    };
    return map[status] ?? RailStatus.Awaiting;
  }
}
