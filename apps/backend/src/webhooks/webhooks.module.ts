import { Module } from "@nestjs/common";
import { ChainModule } from "../chain/chain.module";
import { InvoicesModule } from "../invoices/invoices.module";
import { DirectTransferModule } from "../rails/direct-transfer/direct-transfer.module";
import { WebhooksController } from "./webhooks.controller";
import { WebhooksService } from "./webhooks.service";

@Module({
  imports: [InvoicesModule, DirectTransferModule, ChainModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
