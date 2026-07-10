import { Module } from "@nestjs/common";
import { InvoicesModule } from "../invoices/invoices.module";
import { PublicSubscriptionsController } from "./public-subscriptions.controller";
import { SubscriptionsController } from "./subscriptions.controller";
import { SubscriptionsService } from "./subscriptions.service";

@Module({
  imports: [InvoicesModule],
  providers: [SubscriptionsService],
  controllers: [SubscriptionsController, PublicSubscriptionsController],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
