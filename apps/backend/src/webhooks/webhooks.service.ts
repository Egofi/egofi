import { createHmac, timingSafeEqual } from "node:crypto";
import { InvoiceState, PaymentLeg, RailType, normalizeChain, resolveAsset } from "@egofi/types";
import { Chain } from "@egofi/types";
import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Decimal from "decimal.js";
import { z } from "zod";
import { ChainService } from "../chain/chain.service";
import { PrismaService } from "../core/prisma.service";
import { InvoicesService } from "../invoices/invoices.service";
import { AmountPoolService } from "../rails/direct-transfer/amount-pool.service";
import { bearerTokenFromHeader, timingSafeStringEqual } from "../shared/secrets";

const TatumWebhookSchema = z.object({
  subscriptionId: z.string(),
  type: z.string(),
  txId: z.string().optional(),
  blockNumber: z.number().optional(),
  asset: z.string().optional(),
  amount: z.string().optional(),
  address: z.string().optional(),
  counterAddress: z.string().optional(),
  contractAddress: z.string().optional(),
  chain: z.string().optional(),
  mempool: z.boolean().optional(),
});

type TatumEvent = z.infer<typeof TatumWebhookSchema>;

// The credit pipeline (quote → amount pool → payment URI) is uniformly scaled to
// 6 decimals. Assets whose real decimals differ (e.g. BSC stablecoins, 18) can't
// be credited at this scale without mis-valuing them, so they are held for review
// rather than silently mis-scaled.
const PIPELINE_DECIMALS = 6;

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly invoices: InvoicesService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly amountPool: AmountPoolService,
    private readonly chain: ChainService,
  ) {}

  verifyTatumHmac(rawBody: string, signature: string | undefined): void {
    if (!signature || !/^[a-f0-9]{128}$/i.test(signature)) {
      throw new UnauthorizedException("Invalid Tatum HMAC signature");
    }

    const secret = this.config.getOrThrow<string>("TATUM_WEBHOOK_HMAC_SECRET");
    const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
    const expectedBuf = Buffer.from(expected, "hex");
    const sigBuf = Buffer.from(signature, "hex");
    if (expectedBuf.length !== sigBuf.length || !timingSafeEqual(expectedBuf, sigBuf)) {
      throw new UnauthorizedException("Invalid Tatum HMAC signature");
    }
  }

  verifyProviderWebhookSecret(
    authorization: string | undefined,
    secretHeader: string | undefined,
  ): void {
    const expected = this.config.get<string>("PROVIDER_WEBHOOK_SECRET");
    const nodeEnv = this.config.get<string>("NODE_ENV", "development");
    const isDeployed = nodeEnv === "production" || nodeEnv === "staging";

    if (!expected) {
      if (isDeployed) throw new UnauthorizedException("Provider webhook secret is not configured");
      return;
    }

    const supplied = bearerTokenFromHeader(authorization) ?? secretHeader;
    if (!supplied || !timingSafeStringEqual(supplied, expected)) {
      throw new UnauthorizedException("Invalid provider webhook secret");
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

    const chain = event.chain ?? "UNKNOWN";

    // Fake-token guard: a token that isn't the whitelisted contract for its
    // chain (anyone can deploy one called "USDT") is never credited.
    const resolved = resolveAsset(event.chain, event.asset, event.contractAddress);
    if (!resolved.ok) {
      await this.recordUnmatched(event, resolved.reason);
      return;
    }

    // The pipeline is 6-decimal; anything else (e.g. BSC's 18-decimal USDT)
    // would be mis-valued at this scale, so hold it rather than mis-credit.
    if (resolved.decimals !== PIPELINE_DECIMALS) {
      await this.recordUnmatched(event, "unsupported_decimals");
      return;
    }

    // Tron txs can be included in a block yet REVERT — inclusion is not payment.
    if (normalizeChain(event.chain) === Chain.Tron) {
      const executed = await this.chain.isTronTransactionSuccessful(event.txId);
      if (executed === false) {
        await this.recordUnmatched(event, "tron_reverted");
        return;
      }
    }

    const asset = resolved.symbol;
    const amountBaseUnits = BigInt(
      new Decimal(event.amount).mul(10 ** resolved.decimals).toFixed(0),
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
    await this.recordUnmatched(event, "no_match", candidates);
  }

  /** Capture a deposit we won't credit, with the reason, for ops review. */
  private async recordUnmatched(
    event: TatumEvent,
    reason: string,
    candidates: Array<{ invoiceId: string; expectedBaseUnits: string }> = [],
  ): Promise<void> {
    if (!event.txId || !event.address || !event.amount) return;
    await this.prisma.unmatchedPayment.upsert({
      where: { txHash: event.txId },
      update: { reason },
      create: {
        address: event.address,
        asset: event.asset ?? "UNKNOWN",
        chain: event.chain ?? "UNKNOWN",
        amount: event.amount,
        txHash: event.txId,
        reason,
        ...(candidates.length > 0 ? { candidates } : {}),
      },
    });
    this.logger.warn(
      { txId: event.txId, address: event.address, amount: event.amount, reason, candidates },
      "deposit not credited — recorded as UnmatchedPayment",
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
