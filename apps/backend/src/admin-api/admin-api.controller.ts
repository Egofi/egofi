import type { FeePolicy } from "@egofi/types";
import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";
import type { FastifyRequest } from "fastify";
import { CurrentAdmin } from "../auth/decorators/current-admin.decorator";
import { AdminAuthGuard } from "../auth/guards/admin-auth.guard";
import type { AdminPrincipal } from "../auth/principals";
import { AdminApiService } from "./admin-api.service";

class SuspendMerchantBodyDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

@ApiTags("admin")
@UseGuards(AdminAuthGuard)
@Controller("admin")
export class AdminApiController {
  constructor(private readonly admin: AdminApiService) {}

  @Get("merchants")
  @ApiOperation({ summary: "List all merchants" })
  listMerchants(
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.admin.listMerchants(status, parsePositiveInt(page, 1), parsePositiveInt(limit, 20));
  }

  @Post("merchants/:id/approve")
  @ApiOperation({ summary: "Approve merchant" })
  approveMerchant(
    @Param("id") id: string,
    @CurrentAdmin() actor: AdminPrincipal,
    @Req() req: FastifyRequest,
  ) {
    return this.admin.approveMerchant(id, actor, req.ip);
  }

  @Post("merchants/:id/suspend")
  @ApiOperation({ summary: "Suspend merchant" })
  suspendMerchant(
    @Param("id") id: string,
    @Body() body: SuspendMerchantBodyDto,
    @CurrentAdmin() actor: AdminPrincipal,
    @Req() req: FastifyRequest,
  ) {
    return this.admin.suspendMerchant(id, body.reason, actor, req.ip);
  }

  @Get("fee-policy")
  @ApiOperation({ summary: "Get global fee policy" })
  getFeePolicy() {
    return this.admin.getFeePolicy();
  }

  @Patch("fee-policy")
  @ApiOperation({ summary: "Update global fee policy" })
  updateFeePolicy(
    @Body() body: Partial<FeePolicy>,
    @CurrentAdmin() actor: AdminPrincipal,
    @Req() req: FastifyRequest,
  ) {
    return this.admin.updateFeePolicy(body, actor, req.ip);
  }

  @Get("reconciliation")
  @ApiOperation({ summary: "Get ledger reconciliation summary" })
  getReconciliation(@Query("from") from: string, @Query("to") to: string) {
    return this.admin.getReconciliation(new Date(from), new Date(to));
  }

  @Get("audit-log")
  @ApiOperation({ summary: "View admin audit log" })
  getAuditLog(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("targetType") targetType?: string,
  ) {
    return this.admin.getAuditLog(
      parsePositiveInt(page, 1),
      parsePositiveInt(limit, 50),
      targetType,
    );
  }
}
