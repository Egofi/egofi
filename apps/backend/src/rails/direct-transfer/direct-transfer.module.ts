import { Module } from "@nestjs/common";
import { DirectTransferRail } from "./direct-transfer.rail";
import { AmountPoolService } from "./amount-pool.service";
import { PaymentUriService } from "./payment-uri.service";

@Module({
  providers: [AmountPoolService, PaymentUriService, DirectTransferRail],
  exports: [DirectTransferRail, AmountPoolService, PaymentUriService],
})
export class DirectTransferModule {}
