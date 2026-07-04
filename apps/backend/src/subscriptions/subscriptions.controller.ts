import { SubscriptionPeriodUnit } from "@egofi/types";
import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Merchant } from "@prisma/client";
import {
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { CurrentMerchant } from "../auth/decorators/current-merchant.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { SubscriptionsService } from "./subscriptions.service";

class CreateSubscriptionPlanBodyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsInt()
  @Min(1)
  @Max(3650)
  periodDuration!: number;

  @IsEnum(SubscriptionPeriodUnit)
  periodUnit!: SubscriptionPeriodUnit;

  @IsNumberString()
  costPerPeriod!: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  ipnCallbackUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  successUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  failedUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  partialUrl?: string;
}

@ApiTags("subscriptions")
@UseGuards(JwtAuthGuard)
@Controller("subscriptions")
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Post()
  @ApiOperation({ summary: "Create a subscription plan" })
  create(@CurrentMerchant() merchant: Merchant, @Body() body: CreateSubscriptionPlanBodyDto) {
    return this.subscriptions.create(merchant.id, body);
  }

  @Get()
  @ApiOperation({ summary: "List subscription plans" })
  list(@CurrentMerchant() merchant: Merchant, @Query("search") search?: string) {
    return this.subscriptions.list(merchant.id, search);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a subscription plan" })
  get(@CurrentMerchant() merchant: Merchant, @Param("id") id: string) {
    return this.subscriptions.get(merchant.id, id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a subscription plan" })
  remove(@CurrentMerchant() merchant: Merchant, @Param("id") id: string) {
    return this.subscriptions.remove(merchant.id, id);
  }
}
