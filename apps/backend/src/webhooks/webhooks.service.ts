import { createHmac, timingSafeEqual } from "node:crypto";
import { InvoiceState, PaymentLeg, RailType } from "@egofi/types";
import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import Decimal from "decimal.js";
import { z } from "zod";
import type { PrismaService } from "../core/prisma.service";
import type { InvoicesService } from "../invoices/invoices.service";
import type { AmountPoolService } from "../rails/direct-transfer/amount-pool.service";

const TatumWebhookSchema = z.object({
  subscriptionId: z.string(),
  type: z.string(),
  txId: z.string().optional(),
  blockNumber: z.number().optional(),
  asset: z.string().optional(),
  amount: z.string().optional(),
  address: z.string().optional(),
  counterAddress: z.string().optional(),
  chain: z.string().optional(),
  mempool: z.boolean().optional(),
});

// USDT/USDC on the supported chains use 6 decimals; volatile natives are the
// secondary case (§6 stablecoin-first). Decimals should ultimately come from
// chain metadata — never assumed per-token beyond this default.
const DEFAULT_DECIMALS = 6;

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly invoices: InvoicesService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly amountPool: AmountPoolService,
  ) {}

  verifyTatumHmac(rawBody: string, signature: string): void {
    const secret = this.config.getOrThrow<string>("TATUM_WEBHOOK_HMAC_SECRET");
    const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
    const expectedBuf = Buffer.from(expected);
    const sigBuf = Buffer.from(signature);
    if (expectedBuf.length !== sigBuf.length || !timingSafeEqual(expectedBuf, sigBuf)) {
      throw new UnauthorizedException("Invalid Tatum HMAC signature");
    }
  }

  /**
   * Inbound deposit detection (§8 delivery-guarantee stance): dedupe on
   * (txHash, leg), match via the amount pool, advance the state machine.
   * Money that matches nothing is captured as an UnmatchedPayment with
   * nearest-invoice candidates — never silently dropped.
   */
  async processTatumWebhook(payload: unknown): Promise<void> {
    const parsed = TatumWebhookSchema.safeParse(payload);
    if (!parsed.success) {
      this.logger.warn({ payload, errors: parsed.error }, "Invalid Tatum webhook payload");
      return;
    }

    const event = parsed.data;
    this.logger.log({ type: event.type, txId: event.txId }, "Tatum webhook received");

    if (!event.txId || !event.address || !event.amount) return;
    if (event.mempool) return; // wait for the mined event; matching keys on confirmed txs

    // Idempotent processing: at-least-once delivery means the same tx can
    // arrive twice — dedupe on (txHash, leg) before touching state.
    const seen = await this.prisma.paymentEvent.findFirst({
      where: { txHash: event.txId, leg: PaymentLeg.Deposit },
      select: { id: true },
    });
    if (seen) {
      this.logger.debug({ txId: event.txId }, "duplicate deposit event ignored");
      return;
    }

    const asset = event.asset ?? "UNKNOWN";
    const chain = event.chain ?? "UNKNOWN";
    const amountBaseUnits = BigInt(
      new Decimal(event.amount).mul(10 ** DEFAULT_DECIMALS).toFixed(0),
    );

    const invoiceId = await this.amountPool.matchDeposit({
      address: event.address,
      asset,
      chain,
      amountBaseUnits,
    });

    if (invoiceId) {
      await this.invoices.recordEvent(invoiceId, {
        rail: RailType.DirectTransfer,
        type: event.type,
        txHash: event.txId,
        leg: PaymentLeg.Deposit,
        amount: event.amount,
        asset,
        chain,
        rawPayload: event,
      });

      const invoice = await this.invoices.get(invoiceId);
      if (invoice.state === InvoiceState.AwaitingPayment) {
        await this.invoices.transition(invoiceId, "depositDetected");
      }
      return;
    }

    // No match — capture for review with nearest-invoice suggestions (§13).
    const candidates = await this.amountPool.findCandidates({
      address: event.address,
      asset,
      chain,
      amountBaseUnits,
    });

    await this.prisma.unmatchedPayment.upsert({
      where: { txHash: event.txId },
      update: {},
      create: {
        address: event.address,
        asset,
        chain,
        amount: event.amount,
        txHash: event.txId,
        ...(candidates.length > 0 ? { candidates } : {}),
      },
    });
    this.logger.warn(
      { txId: event.txId, address: event.address, amount: event.amount, candidates },
      "deposit matched no invoice — recorded as UnmatchedPayment",
    );
  }

  async processProviderWebhook(provider: string, payload: unknown): Promise<void> {
    this.logger.log({ provider }, "Provider webhook received");

    const event = payload as { id?: string; status?: string };
    if (!event.id) return;

    // Locate the invoice through the provider-side mirror.
    const providerTx = await this.prisma.providerTransaction.findUnique({
      where: { providerTxId: event.id },
    });
    if (!providerTx) {
      this.logger.warn({ provider, exchangeId: event.id }, "provider webhook for unknown exchange");
      return;
    }

    // Keep the provider mirror fresh for reconciliation + health scoring.
    await this.prisma.providerTransaction.update({
      where: { providerTxId: event.id },
      data: {
        status: event.status ?? providerTx.status,
        raw: JSON.parse(JSON.stringify(payload)),
      },
    });

    await this.invoices.recordEvent(providerTx.invoiceId, {
      rail: RailType.SwapProvider,
      type: `provider.${event.status ?? "unknown"}`,
      rawPayload: { provider, ...(payload as object) },
    });

    // Advance the state machine from the provider status; every transition
    // is idempotent — an already-applied action is rejected by the guard.
    const invoice = await this.invoices.get(providerTx.invoiceId);
    const action = this.providerStatusAction(invoice.state, event.status);
    if (action) {
      await this.invoices.transition(providerTx.invoiceId, action);
    }
  }

  private providerStatusAction(state: string, status?: string): string | null {
    switch (status) {
      case "confirming":
        return state === InvoiceState.AwaitingPayment ? "depositDetected" : null;
      case "exchanging":
        return state === InvoiceState.Received || state === InvoiceState.ComplianceHold
          ? "startConversion"
          : null;
      case "verifying":
        return state === InvoiceState.Received || state === InvoiceState.Converting
          ? "complianceHold"
          : null;
      case "sending":
        return state === InvoiceState.Received || state === InvoiceState.Converting
          ? "payoutSent"
          : null;
      case "finished":
        return state === InvoiceState.PayoutSent || state === InvoiceState.Received
          ? "confirm"
          : null;
      case "failed":
        return "fail";
      case "refunded":
        return state === InvoiceState.Failed ||
          state === InvoiceState.Underpaid ||
          state === InvoiceState.ComplianceHold
          ? "refund"
          : null;
      default:
        return null;
    }
  }
}
