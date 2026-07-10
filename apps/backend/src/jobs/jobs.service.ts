import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, type OnModuleInit } from "@nestjs/common";
import type { Queue } from "bullmq";
import { QUEUES } from "./queues";

@Injectable()
export class JobsService implements OnModuleInit {
  constructor(
    @InjectQueue(QUEUES.DEPOSIT_WATCH)
    private readonly depositWatchQueue: Queue,
    @InjectQueue(QUEUES.DETECTION_SWEEPER)
    private readonly detectionSweeperQueue: Queue,
    @InjectQueue(QUEUES.SWAP_STATUS_POLL)
    private readonly swapStatusPollQueue: Queue,
    @InjectQueue(QUEUES.CONFIRMATION_WATCH)
    private readonly confirmationWatchQueue: Queue,
    @InjectQueue(QUEUES.OUTBOX_DISPATCH)
    private readonly outboxDispatchQueue: Queue,
    @InjectQueue(QUEUES.MERCHANT_WEBHOOK)
    private readonly merchantWebhookQueue: Queue,
    @InjectQueue(QUEUES.RATE_LOCK_EXPIRY)
    private readonly rateLockExpiryQueue: Queue,
    @InjectQueue(QUEUES.COOLDOWN_RELEASE)
    private readonly cooldownReleaseQueue: Queue,
    @InjectQueue(QUEUES.PROVIDER_HEALTH)
    private readonly providerHealthQueue: Queue,
    @InjectQueue(QUEUES.SUBSCRIPTION_BILLING)
    private readonly subscriptionBillingQueue: Queue,
  ) {}

  /**
   * Repeatable schedules (§8): outbox delivery every few seconds, the
   * detection sweeper every minute as the polling safety net for missed
   * webhooks, and the hourly provider-health rollup. Job schedulers are
   * idempotent — re-registering on boot upserts, never duplicates.
   */
  async onModuleInit(): Promise<void> {
    await this.outboxDispatchQueue.upsertJobScheduler(
      "outbox-dispatch-tick",
      { every: 5_000 },
      { name: "dispatch" },
    );
    await this.detectionSweeperQueue.upsertJobScheduler(
      "detection-sweep-tick",
      { every: 60_000 },
      { name: "sweep" },
    );
    await this.providerHealthQueue.upsertJobScheduler(
      "provider-health-tick",
      { pattern: "0 * * * *" }, // hourly
      { name: "rollup" },
    );
    await this.subscriptionBillingQueue.upsertJobScheduler(
      "subscription-billing-tick",
      { pattern: "5 * * * *" }, // hourly, offset from the provider-health rollup
      { name: "bill" },
    );
  }

  async scheduleDepositWatch(invoiceId: string, depositAddress: string) {
    await this.depositWatchQueue.add(
      "watch",
      { invoiceId, depositAddress },
      { jobId: `deposit-watch__${invoiceId}` },
    );
  }

  async scheduleSwapStatusPoll(invoiceId: string, exchangeId: string, provider: string) {
    await this.swapStatusPollQueue.add(
      "poll",
      { invoiceId, exchangeId, provider },
      {
        jobId: `swap-poll__${invoiceId}__${exchangeId}`,
        repeat: { every: 30_000 },
      },
    );
  }

  async cancelSwapStatusPoll(invoiceId: string, exchangeId: string) {
    await this.swapStatusPollQueue.removeRepeatable("poll", {
      every: 30_000,
      jobId: `swap-poll__${invoiceId}__${exchangeId}`,
    });
  }

  async scheduleConfirmationWatch(invoiceId: string, txHash: string, chain: string, leg: string) {
    await this.confirmationWatchQueue.add(
      "watch",
      { invoiceId, txHash, chain, leg },
      { jobId: `confirmation__${invoiceId}__${txHash}__${leg}` },
    );
  }

  async scheduleMerchantWebhook(
    merchantId: string,
    invoiceId: string,
    event: string,
    payload: object,
  ) {
    await this.merchantWebhookQueue.add(
      "deliver",
      { merchantId, invoiceId, event, payload },
      { jobId: `webhook__${invoiceId}__${event}` },
    );
  }

  async scheduleRateLockExpiry(invoiceId: string, expiresAt: Date) {
    const delay = Math.max(0, expiresAt.getTime() - Date.now());
    await this.rateLockExpiryQueue.add(
      "expire",
      { invoiceId },
      { jobId: `rate-lock__${invoiceId}`, delay },
    );
  }

  async scheduleCooldownRelease(invoiceId: string, cooldownUntil: Date) {
    const delay = Math.max(0, cooldownUntil.getTime() - Date.now());
    await this.cooldownReleaseQueue.add(
      "release",
      { invoiceId },
      { jobId: `cooldown__${invoiceId}`, delay },
    );
  }
}
