import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { CoreModule } from "./core/core.module";
import {
  CorrelationIdInterceptor,
  IdempotencyInterceptor,
  ProblemDetailsFilter,
  validateEnv,
} from "./shared";
import { AuthModule } from "./auth/auth.module";
import { MerchantsModule } from "./merchants/merchants.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { CheckoutModule } from "./checkout/checkout.module";
import { RailsModule } from "./rails/rails.module";
import { ChainModule } from "./chain/chain.module";
import { PricingModule } from "./pricing/pricing.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { LedgerModule } from "./ledger/ledger.module";
import { JobsModule } from "./jobs/jobs.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { ComplianceModule } from "./compliance/compliance.module";
import { KybModule } from "./kyb/kyb.module";
import { AdminApiModule } from "./admin-api/admin-api.module";
import { MonitoringModule } from "./monitoring/monitoring.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    ScheduleModule.forRoot(),
    CoreModule,
    MonitoringModule,
    AuthModule,
    MerchantsModule,
    InvoicesModule,
    CheckoutModule,
    RailsModule,
    ChainModule,
    PricingModule,
    WebhooksModule,
    LedgerModule,
    JobsModule,
    NotificationsModule,
    ComplianceModule,
    KybModule,
    AdminApiModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
    { provide: APP_INTERCEPTOR, useClass: CorrelationIdInterceptor },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
})
export class AppModule {}
