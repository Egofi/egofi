import { RailStatus, RailType } from "@egofi/types";
import { Injectable, Logger } from "@nestjs/common";
import type { PrismaService } from "../../core/prisma.service";
import type { Invoice, PaymentInstructions, RailEvent, RouteQuery } from "../rail.interface";
import type { SettlementRail } from "../rail.interface";
import type { AmountPoolService } from "./amount-pool.service";
import type { PaymentUriService } from "./payment-uri.service";

const COOLDOWN_MULTIPLIER = 2;

@Injectable()
export class DirectTransferRail implements SettlementRail {
  readonly railType = RailType.DirectTransfer;
  private readonly logger = new Logger(DirectTransferRail.name);

  constructor(
    private readonly pool: AmountPoolService,
    private readonly uris: PaymentUriService,
    private readonly prisma: PrismaService,
  ) {}

  supports(_query: RouteQuery): boolean {
    // DirectTransferRail handles same-asset-same-chain, or when merchant
    // explicitly accepts the incoming asset (below swap minimum fallback).
    return true;
  }

  async createPayment(invoice: Invoice): Promise<PaymentInstructions> {
    const merchant = await this.prisma.merchant.findUniqueOrThrow({
      where: { id: invoice.merchantId },
    });

    const addresses = merchant.settlementAddresses as Record<string, string>;
    const depositAddress = this.resolveAddress(addresses, invoice.payChain);

    const windowMs = invoice.expiresAt.getTime() - Date.now();
    const cooldownMs = windowMs * COOLDOWN_MULTIPLIER;

    const exactAmount = await this.pool.allocate({
      invoiceId: invoice.id,
      address: depositAddress,
      asset: invoice.payAsset,
      chain: invoice.payChain,
      nominalAmount: invoice.quotedAmount as unknown as bigint,
      expiresAt: invoice.expiresAt,
      cooldownMs,
    });

    const paymentUri = this.uris.buildUri({
      chain: invoice.payChain,
      address: depositAddress,
      amountBaseUnits: exactAmount,
      asset: invoice.payAsset,
    });

    return {
      invoiceId: invoice.id,
      rail: RailType.DirectTransfer,
      depositAddress,
      exactAmount,
      asset: invoice.payAsset,
      chain: invoice.payChain,
      expiresAt: invoice.expiresAt,
      paymentUri,
      paymentUriWithAmount: paymentUri,
      qrData: paymentUri,
    };
  }

  async getStatus(_paymentRef: string): Promise<RailStatus> {
    return RailStatus.Awaiting;
  }

  async handleWebhook(payload: unknown): Promise<RailEvent> {
    // Tatum ADDRESS_EVENT webhook parsing
    const event = payload as {
      txId: string;
      asset: string;
      amount: string;
      address: string;
    };

    this.logger.log(
      { txId: event.txId, asset: event.asset, amount: event.amount },
      "DirectTransfer deposit webhook",
    );

    return {
      type: "DEPOSIT_DETECTED",
      txHash: event.txId,
      amount: BigInt(Math.round(Number.parseFloat(event.amount) * 1e6)),
      asset: event.asset,
      chain: "UNKNOWN",
    };
  }

  private resolveAddress(addresses: Record<string, string>, chain: string): string {
    const evmChains = ["ETHEREUM", "BSC", "POLYGON", "BASE"];
    if (evmChains.includes(chain.toUpperCase())) {
      if (!addresses["evm"]) throw new Error("Merchant has no EVM address configured");
      return addresses["evm"];
    }
    const mapping: Record<string, string> = {
      TRON: "tron",
      SOLANA: "solana",
      BITCOIN: "bitcoin",
    };
    const key = mapping[chain.toUpperCase()];
    if (!key || !addresses[key]) {
      throw new Error(`Merchant has no ${chain} address configured`);
    }
    return addresses[key];
  }
}
