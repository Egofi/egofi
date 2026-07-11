import type { AdminInterval, AdminMetric, FeePolicy } from "@egofi/types";
import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsIn, IsString, MaxLength, MinLength } from "class-validator";
import type { FastifyRequest } from "fastify";
import { CurrentAdmin } from "../auth/decorators/current-admin.decorator";
import { AdminAuthGuard } from "../auth/guards/admin-auth.guard";
import type { AdminPrincipal } from "../auth/principals";
import { AdminAnalyticsService } from "./admin-analytics.service";
import { AdminApiService } from "./admin-api.service";
import { AdminOpsService } from "./admin-ops.service";

class SuspendMerchantBodyDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

class ResolveUnmatchedBodyDto {
  @IsIn(["resolved", "returned"])
  status!: "resolved" | "returned";
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

@ApiTags("admin")
@UseGuards(AdminAuthGuard)
@Controller("admin")
export class AdminApiController {
  constructor(
    private readonly admin: AdminApiService,
    private readonly analytics: AdminAnalyticsService,
    private readonly ops: AdminOpsService,
  ) {}

  // ── Analytics ───────────────────────────────────────────────────

  @Get("analytics/overview")
  @ApiOperation({ summary: "Headline KPIs across all tenants" })
  overview() {
    return this.analytics.overview();
  }

  @Get("analytics/timeseries")
  @ApiOperation({ summary: "Time series for a metric" })
  timeseries(
    @Query("metric") metric: AdminMetric,
    @Query("interval") interval: AdminInterval = "day",
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 3600 * 1000);
    return this.analytics.timeseries(metric ?? "invoices_created", interval, fromDate, toDate);
  }

  @Get("analytics/breakdown")
  @ApiOperation({ summary: "Invoice/volume breakdowns and top merchants" })
  breakdown() {
    return this.analytics.breakdown();
  }

  // ── Cross-tenant reads ──────────────────────────────────────────

  @Get("invoices")
  @ApiOperation({ summary: "List invoices across all merchants" })
  listInvoices(
    @Query("state") state?: string,
    @Query("merchantId") merchantId?: string,
    @Query("chain") chain?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.ops.listInvoices({
      ...(state ? { state } : {}),
      ...(merchantId ? { merchantId } : {}),
      ...(chain ? { chain } : {}),
      page: parsePositiveInt(page, 1),
      limit: parsePositiveInt(limit, 25),
    });
  }

  @Get("invoices/:id")
  @ApiOperation({ summary: "Full invoice detail (any tenant)" })
  getInvoice(@Param("id") id: string) {
    return this.ops.getInvoiceDetail(id);
  }

  @Get("merchants/:id/detail")
  @ApiOperation({ summary: "Merchant profile with stats and recent invoices" })
  merchantDetail(@Param("id") id: string) {
    return this.ops.getMerchantDetail(id);
  }

  @Post("merchants/:id/reactivate")
  @ApiOperation({ summary: "Reactivate a suspended merchant" })
  reactivateMerchant(
    @Param("id") id: string,
    @CurrentAdmin() actor: AdminPrincipal,
    @Req() req: FastifyRequest,
  ) {
    return this.admin.reactivateMerchant(id, actor, req.ip);
  }

  @Get("subscriptions")
  @ApiOperation({ summary: "List subscriptions across all merchants" })
  listSubscriptions(@Query("page") page?: string, @Query("limit") limit?: string) {
    return this.ops.listSubscriptions(parsePositiveInt(page, 1), parsePositiveInt(limit, 25));
  }

  // ── Operations ──────────────────────────────────────────────────

  @Get("ops/health")
  @ApiOperation({ summary: "Queue and provider operational health" })
  opsHealth() {
    return this.ops.opsHealth();
  }

  @Get("ops/unmatched")
  @ApiOperation({ summary: "Payments that matched no invoice" })
  listUnmatched(@Query("status") status?: string) {
    return this.ops.listUnmatched(status ?? "open");
  }

  @Post("ops/unmatched/:id/resolve")
  @ApiOperation({ summary: "Mark an unmatched payment resolved or returned" })
  resolveUnmatched(
    @Param("id") id: string,
    @Body() body: ResolveUnmatchedBodyDto,
    @CurrentAdmin() actor: AdminPrincipal,
    @Req() req: FastifyRequest,
  ) {
    return this.ops.resolveUnmatched(id, body.status, actor, req.ip);
  }

  @Post("ops/outbox/:id/retry")
  @ApiOperation({ summary: "Re-arm a stuck or dead outbox event" })
  retryOutbox(
    @Param("id") id: string,
    @CurrentAdmin() actor: AdminPrincipal,
    @Req() req: FastifyRequest,
  ) {
    return this.ops.retryOutbox(id, actor, req.ip);
  }

  // ── Merchants & policy (existing) ───────────────────────────────

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
