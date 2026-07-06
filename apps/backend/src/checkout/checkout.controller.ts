import type { CreateInvoiceDto, SubscribeNotifyDto } from "@egofi/types";
import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckoutService } from "./checkout.service";

@ApiTags("checkout")
@Controller("checkout")
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Post("sessions")
  @ApiOperation({ summary: "Create a checkout session (public)" })
  createSession(@Body() dto: CreateInvoiceDto) {
    return this.checkout.createSession(dto);
  }

  @Get("sessions/:id")
  @ApiOperation({ summary: "Get checkout session (public)" })
  getSession(@Param("id") id: string) {
    return this.checkout.getSession(id);
  }

  @Get("sessions/:id/status")
  @ApiOperation({ summary: "Poll checkout session status (public)" })
  getStatus(@Param("id") id: string) {
    return this.checkout.getStatus(id);
  }

  @Post("sessions/:id/notify")
  @ApiOperation({ summary: "Subscribe an email to checkout status updates (public)" })
  subscribeNotify(@Param("id") id: string, @Body() body: SubscribeNotifyDto) {
    return this.checkout.subscribeNotify(id, body.email);
  }
}
