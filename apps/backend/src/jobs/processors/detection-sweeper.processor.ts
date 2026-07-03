import { InvoiceState, RailStatus, RailType } from "@egofi/types";
import { Processor } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import type { PrismaService } from "../../core/prisma.service";
import type { InvoicesService } from "../../invoices/invoices.service";
import type { SwapProviderRail } from "../../rails/swap-provider/swap-provider.rail";
import { BaseProcessor } from "../base.processor";
import { QUEUES } from "../queues";

/**
 * Backup detection (§8 delivery-guarantee stance): inbound webhooks are
 * at-least-once at best and can be silently missed. This sweeper polls open
 * invoices every minute so a lost webhook delays a payment by a minute
 * instead of losing it. Never build a flow correct only if every webhook
 * arrives.
 */
@Processor(QUEUES.DETECTION_SWEEPER)
export class DetectionSweeperProcessor extends BaseProcessor {
  private readonly logger = new Logger(DetectionSweeperProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly swapRail: SwapProviderRail,
    private readonly invoices: InvoicesService,
  ) {
    super();
  }

  async process(_job: Job): Promise<void> {
    const open = await this.prisma.invoice.findMany({
      where: {
        state: {
          in: [
            InvoiceState.AwaitingPayment,
            InvoiceState.Received,
            InvoiceState.Converting,
            InvoiceState.PayoutSent,
          ],
        },
        rail: RailType.SwapProvider,
        railRef: { not: null },
        expiresAt: { gte: new Date(Date.now() - 30 * 60_000) }, // sweep 30min past expiry for stragglers
      },
      select: { id: true, state: true, railRef: true },
      take: 200,
    });

    for (const invoice of open) {
      if (!invoice.railRef) continue;
      try {
        const status = await this.swapRail.getStatus(invoice.railRef);
        const action = this.divergedAction(invoice.state, status);
        if (action) {
          this.logger.warn(
            { invoiceId: invoice.id, dbState: invoice.state, providerStatus: status },
            "sweeper caught missed event; advancing state",
          );
          await this.invoices.transition(invoice.id, action);
        }
      } catch (error) {
        this.logger.debug({ invoiceId: invoice.id, error }, "sweep poll failed");
      }
    }
  }

  /** Maps a fresher provider status to the state-machine action that catches up. */
  private divergedAction(dbState: string, status: RailStatus): string | null {
    if (dbState === InvoiceState.AwaitingPayment && status === RailStatus.Received)
      return "depositDetected";
    if (
      (dbState === InvoiceState.AwaitingPayment || dbState === InvoiceState.Received) &&
      status === RailStatus.Converting
    )
      return dbState === InvoiceState.AwaitingPayment ? "depositDetected" : "startConversion";
    if (
      (dbState === InvoiceState.Received || dbState === InvoiceState.Converting) &&
      status === RailStatus.PayoutSent
    )
      return "payoutSent";
    if (dbState === InvoiceState.PayoutSent && status === RailStatus.Settled) return "confirm";
    return null;
  }
}
