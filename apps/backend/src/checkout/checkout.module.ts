import { Module } from "@nestjs/common";
import { CheckoutController } from "./checkout.controller";
import { CheckoutService } from "./checkout.service";
import { InvoicesModule } from "../invoices/invoices.module";
import { RailsModule } from "../rails/rails.module";
import { PricingModule } from "../pricing/pricing.module";
import { JobsModule } from "../jobs/jobs.module";

@Module({
  imports: [InvoicesModule, RailsModule, PricingModule, JobsModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
