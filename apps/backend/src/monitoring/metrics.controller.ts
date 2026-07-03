import { Controller, Get, Header, Res } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import type { FastifyReply } from "fastify";
import type { MetricsService } from "./metrics.service";

@ApiExcludeController()
@Controller("metrics")
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  async scrape(@Res() res: FastifyReply): Promise<void> {
    const body = await this.metrics.getMetrics();
    void res.status(200).header("Content-Type", this.metrics.getContentType()).send(body);
  }
}
