import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Param,
  Post,
  type RawBodyRequest,
  Req,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { FastifyRequest } from "fastify";
import { SkipIdempotency } from "../shared";
import { WebhooksService } from "./webhooks.service";

@ApiTags("webhooks")
@SkipIdempotency()
@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post("tatum")
  @HttpCode(200)
  @ApiOperation({ summary: "Inbound Tatum ADDRESS_EVENT notification" })
  async tatum(
    @Body() body: unknown,
    @Headers("x-payload-hash") signature: string | undefined,
    @Req() req: RawBodyRequest<FastifyRequest>,
  ) {
    const rawBody = req.rawBody?.toString() ?? JSON.stringify(body);
    this.webhooks.verifyTatumHmac(rawBody, signature);
    await this.webhooks.processTatumWebhook(body);
    return { ok: true };
  }

  @Post("providers/:provider")
  @HttpCode(200)
  @ApiOperation({ summary: "Inbound swap provider status webhook" })
  async provider(
    @Param("provider") provider: string,
    @Body() body: unknown,
    @Headers("authorization") authorization?: string,
    @Headers("x-egofi-webhook-secret") webhookSecret?: string,
  ) {
    this.webhooks.verifyProviderWebhookSecret(authorization, webhookSecret);
    await this.webhooks.processProviderWebhook(provider, body);
    return { ok: true };
  }
}
