import { SwapProviderName } from "@egofi/types";
import { Processor } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import type { ProviderHealthService } from "../../rails/swap-provider/provider-health.service";
import { BaseProcessor } from "../base.processor";
import { QUEUES } from "../queues";

/**
 * Hourly rollup (§8 provider-health): per-provider success rate, freeze rate,
 * settle latency, quoted-vs-delivered drift → persisted snapshots feed the
 * failover ranking and the Grafana provider dashboard.
 */
@Processor(QUEUES.PROVIDER_HEALTH)
export class ProviderHealthProcessor extends BaseProcessor {
  private readonly logger = new Logger(ProviderHealthProcessor.name);

  constructor(private readonly providerHealth: ProviderHealthService) {
    super();
  }

  async process(_job: Job): Promise<void> {
    await this.providerHealth.snapshot([SwapProviderName.ChangeNOW, SwapProviderName.SimpleSwap]);
    this.logger.log("provider health snapshots recorded");
  }
}
