import { Processor } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { InvoicesService } from "../../invoices/invoices.service";
import { QUEUES } from "../queues";
import { BaseProcessor } from "../base.processor";

interface RateLockExpiryJobData {
  invoiceId: string;
}

@Processor(QUEUES.RATE_LOCK_EXPIRY)
export class RateLockExpiryProcessor extends BaseProcessor {
  private readonly logger = new Logger(RateLockExpiryProcessor.name);

  constructor(private readonly invoices: InvoicesService) {
    super();
  }

  async process(job: Job<RateLockExpiryJobData>): Promise<void> {
    const { invoiceId } = job.data;

    try {
      await this.invoices.transition(invoiceId, "expire");
      this.logger.log({ invoiceId }, "Invoice expired");
    } catch (err) {
      // Invoice may already be in a terminal state (paid, failed, etc.) — that's fine
      this.logger.debug({ invoiceId, err }, "Invoice expiry skipped (already resolved)");
    }
  }
}
