import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CheckoutService } from "./checkout.service";
import type { CreateInvoiceDto } from "@egofi/types";

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
}
