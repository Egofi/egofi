import { Processor } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { OutboxService } from "../../core/outbox.service";
import { PrismaService } from "../../core/prisma.service";
import { JobsService } from "../jobs.service";
import { QUEUES } from "../queues";
import { BaseProcessor } from "../base.processor";

/**
 * Delivers pending outbox events (§8): runs every few seconds, fetches due
 * rows, hands merchant-facing events to the merchant-webhook queue, and marks
 * them delivered. Failures back off exponentially; exhausted events dead-letter.
 */
@Processor(QUEUES.OUTBOX_DISPATCH)
export class OutboxDispatchProcessor extends BaseProcessor {
  private readonly logger = new Logger(OutboxDispatchProcessor.name);

  constructor(
    private readonly outbox: OutboxService,
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
  ) {
    super();
  }

  async process(_job: Job): Promise<void> {
    const due = await this.outbox.fetchDue();

    for (const event of due) {
      try {
        if (event.aggregate === "invoice") {
          const payload = event.payload as { merchantId?: string };
          const merchantId =
            payload.merchantId ??
            (
              await this.prisma.invoice.findUnique({
                where: { id: event.aggregateId },
                select: { merchantId: true },
              })
            )?.merchantId;

          if (merchantId) {
            await this.jobs.scheduleMerchantWebhook(
              merchantId,
              event.aggregateId,
              event.type,
              event.payload as object,
            );
          }
        }
        await this.outbox.markDelivered(event.id);
      } catch (error) {
        this.logger.warn(
          { outboxEventId: event.id, error },
          "outbox dispatch failed; backing off",
        );
        await this.outbox.markFailed(
          event.id,
          event.attempts,
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  }
}
