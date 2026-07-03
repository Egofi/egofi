import { Processor } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { BaseProcessor } from "../base.processor";
import { QUEUES } from "../queues";

interface DepositWatchJobData {
  invoiceId: string;
  depositAddress: string;
}

@Processor(QUEUES.DEPOSIT_WATCH)
export class DepositWatchProcessor extends BaseProcessor {
  private readonly logger = new Logger(DepositWatchProcessor.name);

  async process(job: Job<DepositWatchJobData>): Promise<void> {
    const { invoiceId, depositAddress } = job.data;
    this.logger.debug({ invoiceId, depositAddress }, "Watching for deposit");
    // Tatum handles real-time notifications; this job is a fallback sweep.
    // Full implementation: query Tatum RPC for address history and match.
  }
}
