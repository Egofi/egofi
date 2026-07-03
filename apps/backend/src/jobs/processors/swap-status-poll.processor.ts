import { RailType } from "@egofi/types";
import { Processor } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import type { InvoicesService } from "../../invoices/invoices.service";
import { BaseProcessor } from "../base.processor";
import { QUEUES } from "../queues";

interface SwapPollJobData {
  invoiceId: string;
  exchangeId: string;
  provider: string;
}

@Processor(QUEUES.SWAP_STATUS_POLL)
export class SwapStatusPollProcessor extends BaseProcessor {
  private readonly logger = new Logger(SwapStatusPollProcessor.name);

  constructor(private readonly invoices: InvoicesService) {
    super();
  }

  async process(job: Job<SwapPollJobData>): Promise<void> {
    const { invoiceId, exchangeId } = job.data;
    this.logger.debug({ invoiceId, exchangeId }, "Polling swap status");

    await this.invoices.recordEvent(invoiceId, {
      rail: RailType.SwapProvider,
      type: "STATUS_POLL",
      rawPayload: { exchangeId, attempt: job.attemptsMade },
    });
    // Full impl: call provider.getStatus(exchangeId), advance invoice state machine
  }
}
