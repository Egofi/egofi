import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Param,
  Post,
  RawBodyRequest,
  Req,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { WebhooksService } from "./webhooks.service";
import { SkipIdempotency } from "../shared";

@ApiTags("webhooks")
@SkipIdempotency() // inbound events dedupe on (txHash, leg); third parties don't send our header
@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post("tatum")
  @HttpCode(200)
  @ApiOperation({ summary: "Inbound Tatum ADDRESS_EVENT notification" })
  async tatum(
    @Body() body: unknown,
    @Headers("x-payload-hash") signature: string,
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
  async provider(@Param("provider") provider: string, @Body() body: unknown) {
    await this.webhooks.processProviderWebhook(provider, body);
    return { ok: true };
  }
}
