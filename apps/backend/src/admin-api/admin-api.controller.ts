import type { FeePolicy } from "@egofi/types";
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AdminAuthGuard } from "../auth/guards/admin-auth.guard";
import { AdminApiService } from "./admin-api.service";

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
    return this.admin.listMerchants(status, page ? Number(page) : 1, limit ? Number(limit) : 20);
  }

  @Post("merchants/:id/approve")
  @ApiOperation({ summary: "Approve merchant" })
  approveMerchant(@Param("id") id: string) {
    return this.admin.approveMerchant(id);
  }

  @Post("merchants/:id/suspend")
  @ApiOperation({ summary: "Suspend merchant" })
  suspendMerchant(@Param("id") id: string, @Body("reason") reason: string) {
    return this.admin.suspendMerchant(id, reason);
  }

  @Get("fee-policy")
  @ApiOperation({ summary: "Get global fee policy" })
  getFeePolicy() {
    return this.admin.getFeePolicy();
  }

  @Patch("fee-policy")
  @ApiOperation({ summary: "Update global fee policy" })
  updateFeePolicy(@Body() body: Partial<FeePolicy>) {
    return this.admin.updateFeePolicy(body);
  }

  @Get("reconciliation")
  @ApiOperation({ summary: "Get ledger reconciliation summary" })
  getReconciliation(@Query("from") from: string, @Query("to") to: string) {
    return this.admin.getReconciliation(new Date(from), new Date(to));
  }
}
