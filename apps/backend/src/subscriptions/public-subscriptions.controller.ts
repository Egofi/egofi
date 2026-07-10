import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";
import { SubscriptionsService } from "./subscriptions.service";

class SubscribeBodyDto {
  @IsEmail()
  @MaxLength(320)
  customerEmail!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(20)
  payAsset!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(20)
  payChain!: string;
}

/**
 * Public, unauthenticated surface backing the hosted subscribe page. Exposes
 * only what a customer needs — never merchant internals.
 */
@ApiTags("public-subscriptions")
@Controller("public/plans")
export class PublicSubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get(":id")
  @ApiOperation({ summary: "Get a subscription plan's public details" })
  getPlan(@Param("id") id: string) {
    return this.subscriptions.getPublicPlan(id);
  }

  @Post(":id/subscribe")
  @ApiOperation({ summary: "Subscribe to a plan; returns the first invoice to pay" })
  subscribe(@Param("id") id: string, @Body() body: SubscribeBodyDto) {
    return this.subscriptions.subscribe(id, body);
  }
}
