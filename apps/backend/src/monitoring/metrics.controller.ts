import { Controller, Get, Header, Headers, Res, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiExcludeController } from "@nestjs/swagger";
import type { FastifyReply } from "fastify";
import { bearerTokenFromHeader, timingSafeStringEqual } from "../shared/secrets";
import { MetricsService } from "./metrics.service";

@ApiExcludeController()
@Controller("metrics")
export class MetricsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @Header("Cache-Control", "no-store")
  async scrape(
    @Headers("authorization") authorization: string | undefined,
    @Res() res: FastifyReply,
  ): Promise<void> {
    this.assertAuthorized(authorization);
    const body = await this.metrics.getMetrics();
    void res.status(200).header("Content-Type", this.metrics.getContentType()).send(body);
  }

  private assertAuthorized(authorization: string | undefined): void {
    const expected = this.config.get<string>("METRICS_BEARER_TOKEN");
    if (!expected) return;

    const supplied = bearerTokenFromHeader(authorization);
    if (!supplied || !timingSafeStringEqual(supplied, expected)) {
      throw new UnauthorizedException("Invalid metrics token");
    }
  }
}
