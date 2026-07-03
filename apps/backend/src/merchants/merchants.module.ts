import { Module } from "@nestjs/common";
import { ComplianceModule } from "../compliance/compliance.module";
import { MerchantsController } from "./merchants.controller";
import { MerchantsService } from "./merchants.service";

@Module({
  imports: [ComplianceModule],
  providers: [MerchantsService],
  controllers: [MerchantsController],
  exports: [MerchantsService],
})
export class MerchantsModule {}
