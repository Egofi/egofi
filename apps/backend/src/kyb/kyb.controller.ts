import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { FastifyRequest } from "fastify";
import { KybService } from "./kyb.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentMerchant } from "../auth/decorators/current-merchant.decorator";
import { SkipIdempotency } from "../shared";
import type { Merchant } from "@prisma/client";
import { KybDocumentType } from "@egofi/types";

@ApiTags("kyb")
@UseGuards(JwtAuthGuard)
@SkipIdempotency() // document actions are form-driven, not payment operations
@Controller("merchant/kyb")
export class KybController {
  constructor(private readonly kyb: KybService) {}

  @Get()
  @ApiOperation({ summary: "Get KYB status, tier ladder, and uploaded documents" })
  getOverview(@CurrentMerchant() merchant: Merchant) {
    return this.kyb.getOverview(merchant.id);
  }

  @Post("documents")
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload a KYB document (multipart; ?type=...)" })
  async uploadDocument(
    @CurrentMerchant() merchant: Merchant,
    @Query("type") type: KybDocumentType,
    @Req() req: FastifyRequest,
  ) {
    if (!type) {
      throw new BadRequestException("A document type query parameter is required.");
    }
    const data = await req.file();
    if (!data) {
      throw new BadRequestException("No file was uploaded.");
    }
    const buffer = await data.toBuffer();
    return this.kyb.uploadDocument(merchant.id, type, {
      buffer,
      filename: data.filename,
      mimeType: data.mimetype,
    });
  }

  @Delete("documents/:id")
  @ApiOperation({ summary: "Remove an uploaded KYB document" })
  async deleteDocument(
    @CurrentMerchant() merchant: Merchant,
    @Param("id") id: string,
  ) {
    await this.kyb.deleteDocument(merchant.id, id);
    return { ok: true };
  }

  @Post("submit")
  @ApiOperation({ summary: "Submit KYB documents for operator review" })
  submit(@CurrentMerchant() merchant: Merchant) {
    return this.kyb.submit(merchant.id);
  }
}
