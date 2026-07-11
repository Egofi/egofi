import { Module } from "@nestjs/common";
import { LedgerModule } from "../ledger/ledger.module";
import { MerchantsModule } from "../merchants/merchants.module";
import { AdminAnalyticsService } from "./admin-analytics.service";
import { AdminApiController } from "./admin-api.controller";
import { AdminApiService } from "./admin-api.service";
import { AdminOpsService } from "./admin-ops.service";

@Module({
  imports: [MerchantsModule, LedgerModule],
  controllers: [AdminApiController],
  providers: [AdminApiService, AdminAnalyticsService, AdminOpsService],
})
export class AdminApiModule {}
