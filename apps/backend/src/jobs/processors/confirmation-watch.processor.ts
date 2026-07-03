import { CHAIN_CONFIGS, type Chain } from "@egofi/types";
import { Processor } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import type { InvoicesService } from "../../invoices/invoices.service";
import { BaseProcessor } from "../base.processor";
import { QUEUES } from "../queues";

interface ConfirmationWatchJobData {
  invoiceId: string;
  txHash: string;
  chain: string;
  leg: string;
}

@Processor(QUEUES.CONFIRMATION_WATCH)
export class ConfirmationWatchProcessor extends BaseProcessor {
  private readonly logger = new Logger(ConfirmationWatchProcessor.name);

  constructor(private readonly invoices: InvoicesService) {
    super();
  }

  async process(job: Job<ConfirmationWatchJobData>): Promise<void> {
    const { invoiceId, txHash, chain, leg } = job.data;
    const config = CHAIN_CONFIGS[chain as Chain];
    const required = config?.confirmationsRequired ?? 12;

    this.logger.debug({ invoiceId, txHash, chain, leg, required }, "Watching tx confirmation");

    // Full impl: query Tatum for tx confirmations, advance to PAID_CONFIRMED when threshold met
    await this.invoices.recordEvent(invoiceId, {
      rail: "CONFIRMATION_WATCH",
      type: "CONFIRMATION_CHECK",
      txHash,
      leg,
      rawPayload: { chain, required, attempt: job.attemptsMade },
    });
  }
}
