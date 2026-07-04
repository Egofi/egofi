import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { AdminAuthGuard } from "../auth/guards/admin-auth.guard";
import { KybService } from "./kyb.service";

class ApproveKybDto {
  @IsInt()
  @Min(0)
  @Max(2)
  tier!: number;

  @IsString()
  @IsOptional()
  note?: string;
}

class RejectKybDto {
  @IsString()
  note!: string;
}

@ApiTags("admin-kyb")
@UseGuards(AdminAuthGuard)
@Controller("admin/kyb")
export class KybAdminController {
  constructor(private readonly kyb: KybService) {}

  @Get("pending")
  @ApiOperation({ summary: "List merchants awaiting KYB review" })
  listPending() {
    return this.kyb.listPending();
  }

  @Get("documents/:id/url")
  @ApiOperation({ summary: "Get a short-lived signed URL to view a document" })
  getDocumentUrl(@Param("id") id: string) {
    return this.kyb.getDocumentViewUrl(id);
  }

  @Post("merchants/:merchantId/approve")
  @ApiOperation({ summary: "Approve KYB and set the merchant's tier" })
  approve(@Param("merchantId") merchantId: string, @Body() dto: ApproveKybDto) {
    return this.kyb.approve(merchantId, dto.tier, dto.note);
  }

  @Post("merchants/:merchantId/reject")
  @ApiOperation({ summary: "Reject KYB with a reason" })
  reject(@Param("merchantId") merchantId: string, @Body() dto: RejectKybDto) {
    return this.kyb.reject(merchantId, dto.note);
  }
}
