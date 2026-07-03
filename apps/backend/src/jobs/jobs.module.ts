import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { FastifyAdapter as BullBoardFastifyAdapter } from "@bull-board/fastify";
import { BullBoardModule } from "@bull-board/nestjs";
import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InvoicesModule } from "../invoices/invoices.module";
import { RailsModule } from "../rails/rails.module";
import { WebhooksModule } from "../webhooks/webhooks.module";
import { JobsService } from "./jobs.service";
import { ConfirmationWatchProcessor } from "./processors/confirmation-watch.processor";
import { DepositWatchProcessor } from "./processors/deposit-watch.processor";
import { DetectionSweeperProcessor } from "./processors/detection-sweeper.processor";
import { MerchantWebhookProcessor } from "./processors/merchant-webhook.processor";
import { OutboxDispatchProcessor } from "./processors/outbox-dispatch.processor";
import { ProviderHealthProcessor } from "./processors/provider-health.processor";
import { RateLockExpiryProcessor } from "./processors/rate-lock-expiry.processor";
import { SwapStatusPollProcessor } from "./processors/swap-status-poll.processor";
import { QUEUES } from "./queues";

export { QUEUES } from "./queues";

const ALL_QUEUES = Object.values(QUEUES);

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.getOrThrow<string>("REDIS_URL") },
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: "exponential", delay: 2_000 },
          removeOnComplete: { age: 3600 * 24 },
          removeOnFail: false,
        },
      }),
    }),
    BullModule.registerQueue(...ALL_QUEUES.map((name) => ({ name }))),
    // Bull Board — mount all queues for the web UI
    BullBoardModule.forRoot({
      route: "/admin/queues",
      adapter: BullBoardFastifyAdapter,
    }),
    ...ALL_QUEUES.map((name) =>
      // Bull Board v5 (Fastify 4-compatible) was typed against an older
      // bullmq; the adapter is runtime-compatible with bullmq 5.
      BullBoardModule.forFeature({ name, adapter: BullMQAdapter as never }),
    ),
    InvoicesModule,
    WebhooksModule,
    RailsModule,
  ],
  providers: [
    JobsService,
    DepositWatchProcessor,
    DetectionSweeperProcessor,
    SwapStatusPollProcessor,
    ConfirmationWatchProcessor,
    OutboxDispatchProcessor,
    MerchantWebhookProcessor,
    RateLockExpiryProcessor,
    ProviderHealthProcessor,
  ],
  exports: [JobsService, BullModule],
})
export class JobsModule {}
