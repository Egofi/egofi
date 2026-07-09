import type { CreateInvoiceDto } from "@egofi/types";
import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import {
  IsEmail,
  IsInt,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { CheckoutService } from "./checkout.service";

class CreateCheckoutSessionBodyDto implements CreateInvoiceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  merchantId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(10)
  displayCurrency!: string;

  @IsNumberString()
  displayAmount!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(40)
  payAsset!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(40)
  payChain!: string;

  @IsString()
  @IsOptional()
  @MaxLength(256)
  refundAddress?: string;

  @IsInt()
  @Min(300)
  @Max(86_400)
  @IsOptional()
  ttlSeconds?: number;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

class SubscribeNotifyBodyDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

@ApiTags("checkout")
@Controller("checkout")
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Post("sessions")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: "Create a checkout session (public)" })
  createSession(@Body() dto: CreateCheckoutSessionBodyDto) {
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
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Subscribe an email to checkout status updates (public)" })
  subscribeNotify(@Param("id") id: string, @Body() body: SubscribeNotifyBodyDto) {
    return this.checkout.subscribeNotify(id, body.email);
  }
}
