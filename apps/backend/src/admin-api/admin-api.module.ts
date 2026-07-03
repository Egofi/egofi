import { Module } from "@nestjs/common";
import { LedgerModule } from "../ledger/ledger.module";
import { MerchantsModule } from "../merchants/merchants.module";
import { AdminApiController } from "./admin-api.controller";
import { AdminApiService } from "./admin-api.service";

@Module({
  imports: [MerchantsModule, LedgerModule],
  controllers: [AdminApiController],
  providers: [AdminApiService],
})
export class AdminApiModule {}
