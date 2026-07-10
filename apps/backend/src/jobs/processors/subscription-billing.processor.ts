import { Processor } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { SubscriptionsService } from "../../subscriptions/subscriptions.service";
import { BaseProcessor } from "../base.processor";
import { QUEUES } from "../queues";

/**
 * Recurring billing: issues the next invoice for every ACTIVE subscription
 * whose period has elapsed, then rolls the period cursor forward. Runs hourly
 * so a subscription bills within an hour of its period boundary. Safe to retry
 * — the cursor only advances after the invoice is created.
 */
@Processor(QUEUES.SUBSCRIPTION_BILLING)
export class SubscriptionBillingProcessor extends BaseProcessor {
  private readonly logger = new Logger(SubscriptionBillingProcessor.name);

  constructor(private readonly subscriptions: SubscriptionsService) {
    super();
  }

  async process(_job: Job): Promise<void> {
    const { billed } = await this.subscriptions.billDueSubscriptions();
    if (billed > 0) {
      this.logger.log(`billed ${billed} subscription${billed === 1 ? "" : "s"}`);
    }
  }
}
