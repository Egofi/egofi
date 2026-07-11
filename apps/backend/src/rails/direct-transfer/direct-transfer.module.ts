import { Module } from "@nestjs/common";
import { AmountPoolService } from "./amount-pool.service";
import { DirectTransferRail } from "./direct-transfer.rail";
import { PaymentUriService } from "./payment-uri.service";
import { XpubDerivationService } from "./xpub-derivation.service";

@Module({
  providers: [AmountPoolService, PaymentUriService, XpubDerivationService, DirectTransferRail],
  exports: [DirectTransferRail, AmountPoolService, PaymentUriService],
})
export class DirectTransferModule {}
