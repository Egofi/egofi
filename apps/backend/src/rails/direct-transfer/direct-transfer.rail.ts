import { RailStatus, RailType } from "@egofi/types";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../core/prisma.service";
import type { Invoice, PaymentInstructions, RailEvent, RouteQuery } from "../rail.interface";
import type { SettlementRail } from "../rail.interface";
import { resolveSettlementAddress, settlementAddressLabel } from "../settlement-address";
import { AmountPoolService } from "./amount-pool.service";
import { PaymentUriService } from "./payment-uri.service";
import { XpubDerivationService } from "./xpub-derivation.service";

const COOLDOWN_MULTIPLIER = 2;

@Injectable()
export class DirectTransferRail implements SettlementRail {
  readonly railType = RailType.DirectTransfer;
  private readonly logger = new Logger(DirectTransferRail.name);

  constructor(
    private readonly pool: AmountPoolService,
    private readonly uris: PaymentUriService,
    private readonly prisma: PrismaService,
    private readonly xpub: XpubDerivationService,
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
    const depositAddress = await this.resolveDepositAddress(merchant, invoice.payChain, addresses);

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

  /**
   * The address the customer pays. With xpub mode on (and a chain we can derive
   * for), each invoice gets its own address derived at the next BIP44 index —
   * the merchant controls the key for all of them. Otherwise, and as a fallback
   * if derivation ever fails, we use the merchant's static settlement address
   * (deposits disambiguated by exact amount).
   */
  private async resolveDepositAddress(
    merchant: { id: string; xpub: string | null; xpubMode: boolean },
    chain: string,
    addresses: Record<string, string>,
  ): Promise<string> {
    const canDerive =
      merchant.xpubMode &&
      merchant.xpub &&
      XpubDerivationService.supports(chain) &&
      XpubDerivationService.isValidXpub(merchant.xpub);

    if (canDerive && merchant.xpub) {
      try {
        // Atomically claim the next index so concurrent invoices never collide.
        const { xpubIndex } = await this.prisma.merchant.update({
          where: { id: merchant.id },
          data: { xpubIndex: { increment: 1 } },
          select: { xpubIndex: true },
        });
        return this.xpub.deriveAddress(merchant.xpub, chain, xpubIndex - 1);
      } catch (err) {
        // Availability over uniqueness: a derivation error must not block payment.
        this.logger.error(
          { err, merchantId: merchant.id, chain },
          "xpub derivation failed; falling back to the static settlement address",
        );
      }
    }
    return this.resolveAddress(addresses, chain);
  }

  private resolveAddress(addresses: Record<string, string>, chain: string): string {
    const address = resolveSettlementAddress(addresses, chain);
    if (!address) {
      // A BadRequest, not a 500: nothing is broken, the merchant simply hasn't
      // told us where to send the money yet.
      throw new BadRequestException(
        `This merchant has not configured a ${settlementAddressLabel(chain)} settlement address, so ${chain} payments cannot be accepted.`,
      );
    }
    return address;
  }
}
