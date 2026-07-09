import { createHmac } from "node:crypto";
import { Processor } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Job } from "bullmq";
import { CryptoService } from "../../core/crypto.service";
import { PrismaService } from "../../core/prisma.service";
import { BaseProcessor } from "../base.processor";
import { QUEUES } from "../queues";

interface MerchantWebhookJobData {
  merchantId: string;
  invoiceId: string;
  event: string;
  payload: Record<string, unknown>;
}

@Processor(QUEUES.MERCHANT_WEBHOOK)
export class MerchantWebhookProcessor extends BaseProcessor {
  private readonly logger = new Logger(MerchantWebhookProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly crypto: CryptoService,
  ) {
    super();
  }

  async process(job: Job<MerchantWebhookJobData>): Promise<void> {
    const { merchantId, invoiceId, event, payload } = job.data;

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { webhookUrl: true, webhookSecret: true },
    });

    if (!merchant?.webhookUrl) return;

    const body = JSON.stringify({
      id: job.id,
      event,
      invoiceId,
      merchantId,
      data: payload,
      timestamp: new Date().toISOString(),
    });

    // Sign with the merchant's own IPN secret when set (so they can verify with
    // the secret shown in their dashboard); otherwise fall back to the global one.
    const secret = merchant.webhookSecret
      ? this.crypto.decryptMaybe(merchant.webhookSecret)
      : this.config.getOrThrow<string>("WEBHOOK_SIGNING_SECRET");
    const signature = createHmac("sha256", secret).update(body).digest("hex");

    const res = await fetch(merchant.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-egofi-signature": `sha256=${signature}`,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    await this.prisma.webhookDelivery.create({
      data: {
        merchantId,
        invoiceId,
        event,
        payload: payload as object,
        url: merchant.webhookUrl,
        status: res.ok ? "DELIVERED" : "FAILED",
        attempts: (job.attemptsMade ?? 0) + 1,
        deliveredAt: res.ok ? new Date() : null,
        lastError: res.ok ? null : `HTTP ${res.status}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Webhook delivery failed with HTTP ${res.status}`);
    }

    this.logger.log({ invoiceId, event, status: res.status }, "Webhook delivered");
  }
}
