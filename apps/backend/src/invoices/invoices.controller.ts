import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Merchant } from "@prisma/client";
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
} from "class-validator";
import { CurrentMerchant } from "../auth/decorators/current-merchant.decorator";
import { MerchantAuthGuard } from "../auth/guards/merchant-auth.guard";
import { InvoicesService } from "./invoices.service";

class CreateInvoiceBodyDto {
  @IsString()
  displayCurrency!: string;

  @IsNumberString()
  displayAmount!: string;

  @IsString()
  payAsset!: string;

  @IsString()
  payChain!: string;

  @IsString()
  @IsOptional()
  refundAddress?: string;

  // Optional invoice lifetime; defaults to 30 minutes server-side.
  @IsInt()
  @Min(300) // 5 minutes
  @Max(86_400) // 24 hours
  @IsOptional()
  ttlSeconds?: number;

  /** Send the payer a receipt / reminders for this invoice. */
  @IsEmail()
  @MaxLength(320)
  @IsOptional()
  notifyEmail?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

@ApiTags("invoices")
@UseGuards(MerchantAuthGuard)
@Controller("invoices")
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Post()
  @ApiOperation({ summary: "Create an invoice" })
  @ApiHeader({
    name: "Idempotency-Key",
    required: true,
    description:
      "Unique key (8–128 chars) — a retried request with the same key replays the original response instead of creating a second invoice",
  })
  async create(@CurrentMerchant() merchant: Merchant, @Body() body: CreateInvoiceBodyDto) {
    return this.invoices.create({ ...body, merchantId: merchant.id }, "0", "0");
  }

  @Get()
  @ApiOperation({ summary: "List merchant invoices" })
  list(
    @CurrentMerchant() merchant: Merchant,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("state") state?: string,
  ) {
    return this.invoices.list(
      merchant.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      state,
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Get invoice by ID" })
  get(@CurrentMerchant() merchant: Merchant, @Param("id") id: string) {
    // Scoped: a merchant must never be able to read another merchant's invoice.
    return this.invoices.getForMerchant(merchant.id, id);
  }

  @Get(":id/events")
  @ApiOperation({ summary: "Get an invoice's payment timeline" })
  events(@CurrentMerchant() merchant: Merchant, @Param("id") id: string) {
    return this.invoices.listEvents(merchant.id, id);
  }
}
