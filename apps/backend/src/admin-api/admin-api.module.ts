import { Module } from "@nestjs/common";
import { AdminApiController } from "./admin-api.controller";
import { AdminApiService } from "./admin-api.service";
import { MerchantsModule } from "../merchants/merchants.module";
import { LedgerModule } from "../ledger/ledger.module";

@Module({
  imports: [MerchantsModule, LedgerModule],
  controllers: [AdminApiController],
  providers: [AdminApiService],
})
export class AdminApiModule {}
