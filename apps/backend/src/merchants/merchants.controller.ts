import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Merchant } from "@prisma/client";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { CurrentMerchant } from "../auth/decorators/current-merchant.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { MerchantsService } from "./merchants.service";

class UpdateProfileBodyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @IsOptional()
  business?: string;
}

class SetWebhookBodyDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  webhookUrl?: string;
}

@ApiTags("merchant")
@UseGuards(JwtAuthGuard)
@Controller("merchant")
export class MerchantsController {
  constructor(private readonly merchants: MerchantsService) {}

  @Get("profile")
  @ApiOperation({ summary: "Get merchant profile" })
  getProfile(@CurrentMerchant() merchant: Merchant) {
    return merchant;
  }

  @Patch("profile")
  @ApiOperation({ summary: "Update merchant profile" })
  updateProfile(@CurrentMerchant() merchant: Merchant, @Body() body: UpdateProfileBodyDto) {
    return this.merchants.updateProfile(merchant.id, body);
  }

  @Patch("settlement")
  @ApiOperation({ summary: "Update settlement config" })
  updateSettlement(@CurrentMerchant() merchant: Merchant, @Body() body: object) {
    return this.merchants.updateSettlement(merchant.id, body as never);
  }

  @Post("api-keys")
  @ApiOperation({ summary: "Create a new API key" })
  createApiKey(@CurrentMerchant() merchant: Merchant, @Body("name") name: string) {
    return this.merchants.createApiKey(merchant.id, name);
  }

  @Get("api-keys")
  @ApiOperation({ summary: "List API keys" })
  listApiKeys(@CurrentMerchant() merchant: Merchant) {
    return this.merchants.listApiKeys(merchant.id);
  }

  @Delete("api-keys/:id")
  @ApiOperation({ summary: "Delete an API key" })
  deleteApiKey(@CurrentMerchant() merchant: Merchant, @Param("id") id: string) {
    return this.merchants.deleteApiKey(merchant.id, id);
  }

  @Get("integration")
  @ApiOperation({ summary: "Get webhook/IPN integration settings" })
  getIntegration(@CurrentMerchant() merchant: Merchant) {
    return this.merchants.getIntegration(merchant.id);
  }

  @Patch("webhook")
  @ApiOperation({ summary: "Set the webhook (IPN) callback URL" })
  setWebhook(@CurrentMerchant() merchant: Merchant, @Body() body: SetWebhookBodyDto) {
    return this.merchants.setWebhookUrl(merchant.id, body.webhookUrl ?? null);
  }

  @Post("ipn-secret")
  @ApiOperation({ summary: "Generate or rotate the IPN signing secret" })
  rotateIpnSecret(@CurrentMerchant() merchant: Merchant) {
    return this.merchants.rotateIpnSecret(merchant.id);
  }
}
