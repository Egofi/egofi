import { Module } from "@nestjs/common";
import { InvoicesModule } from "../invoices/invoices.module";
import { JobsModule } from "../jobs/jobs.module";
import { PricingModule } from "../pricing/pricing.module";
import { RailsModule } from "../rails/rails.module";
import { CheckoutController } from "./checkout.controller";
import { CheckoutService } from "./checkout.service";

@Module({
  imports: [InvoicesModule, RailsModule, PricingModule, JobsModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
