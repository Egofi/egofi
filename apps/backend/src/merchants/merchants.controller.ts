import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsObject, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { CurrentMerchant } from "../auth/decorators/current-merchant.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { AuthenticatedMerchant } from "../auth/principals";
import { publicMerchant } from "../auth/principals";
import { MerchantsService } from "./merchants.service";

class UpdateProfileBodyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @IsOptional()
  business?: string;
}

class UpdateSettlementBodyDto {
  @IsString()
  @IsOptional()
  @MaxLength(40)
  settlementAsset?: string;

  @IsObject()
  @IsOptional()
  settlementAddresses?: Record<string, string>;

  @IsString()
  @IsOptional()
  @MaxLength(512)
  xpub?: string;

  @IsString()
  @IsOptional()
  @MaxLength(512)
  xpubTron?: string;

  @IsBoolean()
  @IsOptional()
  xpubMode?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  webhookUrl?: string;
}

class CreateApiKeyBodyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;
}

class SetWebhookBodyDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  webhookUrl?: string | null;
}

@ApiTags("merchant")
@UseGuards(JwtAuthGuard)
@Controller("merchant")
export class MerchantsController {
  constructor(private readonly merchants: MerchantsService) {}

  @Get("profile")
  @ApiOperation({ summary: "Get merchant profile" })
  getProfile(@CurrentMerchant() merchant: AuthenticatedMerchant) {
    return publicMerchant(merchant);
  }

  @Patch("profile")
  @ApiOperation({ summary: "Update merchant profile" })
  updateProfile(
    @CurrentMerchant() merchant: AuthenticatedMerchant,
    @Body() body: UpdateProfileBodyDto,
  ) {
    return this.merchants.updateProfile(merchant.id, body);
  }

  @Patch("settlement")
  @ApiOperation({ summary: "Update settlement config" })
  updateSettlement(
    @CurrentMerchant() merchant: AuthenticatedMerchant,
    @Body() body: UpdateSettlementBodyDto,
  ) {
    return this.merchants.updateSettlement(merchant.id, body);
  }

  @Post("api-keys")
  @ApiOperation({ summary: "Create a new API key" })
  createApiKey(
    @CurrentMerchant() merchant: AuthenticatedMerchant,
    @Body() body: CreateApiKeyBodyDto,
  ) {
    return this.merchants.createApiKey(merchant.id, body.name);
  }

  @Get("api-keys")
  @ApiOperation({ summary: "List API keys" })
  listApiKeys(@CurrentMerchant() merchant: AuthenticatedMerchant) {
    return this.merchants.listApiKeys(merchant.id);
  }

  @Delete("api-keys/:id")
  @ApiOperation({ summary: "Delete an API key" })
  deleteApiKey(@CurrentMerchant() merchant: AuthenticatedMerchant, @Param("id") id: string) {
    return this.merchants.deleteApiKey(merchant.id, id);
  }

  @Get("integration")
  @ApiOperation({ summary: "Get webhook/IPN integration settings" })
  getIntegration(@CurrentMerchant() merchant: AuthenticatedMerchant) {
    return this.merchants.getIntegration(merchant.id);
  }

  @Patch("webhook")
  @ApiOperation({ summary: "Set the webhook (IPN) callback URL" })
  setWebhook(@CurrentMerchant() merchant: AuthenticatedMerchant, @Body() body: SetWebhookBodyDto) {
    return this.merchants.setWebhookUrl(merchant.id, body.webhookUrl ?? null);
  }

  @Post("ipn-secret")
  @ApiOperation({ summary: "Generate or rotate the IPN signing secret" })
  rotateIpnSecret(@CurrentMerchant() merchant: AuthenticatedMerchant) {
    return this.merchants.rotateIpnSecret(merchant.id);
  }
}
