import type {
  CheckoutSessionDto,
  CreateInvoiceDto,
  InvoiceDto,
  InvoiceStatusDto,
  PaymentInstructions,
} from "@egofi/types";
import { InvoiceState, RailType } from "@egofi/types";
import { Injectable, NotFoundException } from "@nestjs/common";
import type { PrismaService } from "../core/prisma.service";
import type { InvoicesService } from "../invoices/invoices.service";
import type { JobsService } from "../jobs/jobs.service";
import type { PricingService } from "../pricing/pricing.service";
import type { RailRouter } from "../rails/rail.router";

// Maps a settlement asset label to the chain it settles on. Merchants configure
// a single settlement asset (default USDT-TRC20); the payout chain is implied.
const SETTLEMENT_CHAIN: Record<string, string> = {
  "USDT-TRC20": "TRON",
  "USDT-BEP20": "BSC",
  "USDT-ERC20-POLYGON": "POLYGON",
  "USDC-SOL": "SOLANA",
  "USDC-BASE": "BASE",
};

function settlementChain(asset: string): string {
  return SETTLEMENT_CHAIN[asset.toUpperCase()] ?? "TRON";
}

@Injectable()
export class CheckoutService {
  constructor(
    private readonly invoices: InvoicesService,
    private readonly router: RailRouter,
    private readonly pricing: PricingService,
    private readonly jobs: JobsService,
    private readonly prisma: PrismaService,
  ) {}

  async createSession(dto: CreateInvoiceDto): Promise<CheckoutSessionDto> {
    // Quote + create the invoice in DRAFT, then issue it (allocate the rail +
    // deposit address, move to AWAITING_PAYMENT).
    const quote = await this.pricing.getQuote(dto.payAsset, dto.displayCurrency, dto.displayAmount);
    const invoice = await this.invoices.create(dto, quote.quotedAmount, quote.rate);
    const instructions = await this.issueInvoice(invoice);

    return {
      invoice: { ...invoice, state: InvoiceState.AwaitingPayment },
      instructions: this.toInstructionsDto(instructions),
    };
  }

  async getSession(invoiceId: string): Promise<CheckoutSessionDto> {
    let invoice = await this.invoices.get(invoiceId);

    // Lazy issuance: merchant-created invoices are persisted as DRAFT and only
    // allocated a deposit address when the customer actually opens the hosted
    // link. This keeps the merchant's authenticated POST /invoices simple and
    // avoids allocating addresses for links nobody clicks.
    if (invoice.state === InvoiceState.Draft) {
      const instructions = await this.issueInvoice(invoice);
      invoice = await this.invoices.get(invoiceId);
      return { invoice, instructions: this.toInstructionsDto(instructions) };
    }

    const dbInvoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { depositAddress: true, expectedAmount: true, expiresAt: true },
    });
    if (!dbInvoice) throw new NotFoundException(`Session ${invoiceId} not found`);

    return {
      invoice,
      instructions: {
        depositAddress: dbInvoice.depositAddress ?? "",
        exactAmount: dbInvoice.expectedAmount?.toString() ?? "0",
        asset: invoice.payAsset,
        chain: invoice.payChain,
        paymentUri: "",
        qrData: dbInvoice.depositAddress ?? "",
        expiresAt: dbInvoice.expiresAt.toISOString(),
      },
    };
  }

  async getStatus(invoiceId: string): Promise<InvoiceStatusDto> {
    const invoice = await this.invoices.get(invoiceId);
    const events = await this.prisma.paymentEvent.findMany({
      where: { invoiceId },
      orderBy: { ts: "desc" },
      take: 1,
    });
    const latest = events[0];

    return {
      invoiceId,
      state: invoice.state,
      ...(latest?.txHash ? { depositTxHash: latest.txHash } : {}),
      updatedAt: latest?.ts.toISOString() ?? invoice.createdAt,
    };
  }

  /**
   * Selects a rail, generates payment instructions, moves the invoice to
   * AWAITING_PAYMENT, and schedules the watch jobs. Shared by createSession
   * (eager) and getSession (lazy, on first customer view).
   */
  private async issueInvoice(invoice: InvoiceDto): Promise<PaymentInstructions> {
    // Merchant-created invoices are persisted with a zero quote; quote now (at
    // issue time) so the deposit amount is correct. Sessions created via the
    // checkout API already carry a live quote and skip the re-quote.
    let quotedAmount = invoice.quotedAmount;
    if (!quotedAmount || Number.parseFloat(quotedAmount) <= 0) {
      const quote = await this.pricing.getQuote(
        invoice.payAsset,
        invoice.displayCurrency,
        invoice.displayAmount,
      );
      quotedAmount = quote.quotedAmount;
    }

    // Route toward the merchant's actual settlement asset/chain — not a
    // hardcoded default — so same-network payments settle directly and
    // cross-asset payments route through a swap.
    const merchant = await this.prisma.merchant.findUniqueOrThrow({
      where: { id: invoice.merchantId },
      select: { settlementAsset: true },
    });

    const rail = this.router.select({
      fromAsset: invoice.payAsset,
      fromChain: invoice.payChain,
      toAsset: merchant.settlementAsset,
      toChain: settlementChain(merchant.settlementAsset),
      amountBaseUnits: BigInt(Math.round(Number.parseFloat(quotedAmount) * 1e6)),
    });

    const invoiceForRail = {
      ...invoice,
      quotedAmount: BigInt(Math.round(Number.parseFloat(quotedAmount) * 1e6)),
      displayAmount: BigInt(Math.round(Number.parseFloat(invoice.displayAmount) * 1e6)),
      rate: BigInt(0),
      rail: rail.railType,
      railRef: null,
      rateLockedUntil: new Date(invoice.rateLockedUntil),
      createdAt: new Date(invoice.createdAt),
      expiresAt: new Date(invoice.expiresAt),
      refundAddress: invoice.refundAddress,
    };

    const instructions = await rail.createPayment(invoiceForRail);

    await this.invoices.transition(invoice.id, "issue", {
      rail: rail.railType,
      ...(instructions.providerRef ? { railRef: instructions.providerRef } : {}),
      depositAddress: instructions.depositAddress,
      expectedAmount: instructions.exactAmount.toString(),
    });

    await this.jobs.scheduleRateLockExpiry(invoice.id, new Date(invoice.expiresAt));
    if (rail.railType === RailType.DirectTransfer) {
      await this.jobs.scheduleDepositWatch(invoice.id, instructions.depositAddress);
    } else if (rail.railType === RailType.SwapProvider && instructions.providerRef) {
      await this.jobs.scheduleSwapStatusPoll(invoice.id, instructions.providerRef, "changenow");
    }

    return instructions;
  }

  private toInstructionsDto(instructions: PaymentInstructions): CheckoutSessionDto["instructions"] {
    return {
      depositAddress: instructions.depositAddress,
      exactAmount: instructions.exactAmount.toString(),
      asset: instructions.asset,
      chain: instructions.chain,
      paymentUri: instructions.paymentUri,
      qrData: instructions.qrData,
      expiresAt: instructions.expiresAt.toISOString(),
      ...(instructions.providerRef ? { providerRef: instructions.providerRef } : {}),
    };
  }
}
