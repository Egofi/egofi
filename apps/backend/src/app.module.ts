import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AdminApiModule } from "./admin-api/admin-api.module";
import { AuthModule } from "./auth/auth.module";
import { ChainModule } from "./chain/chain.module";
import { CheckoutModule } from "./checkout/checkout.module";
import { ComplianceModule } from "./compliance/compliance.module";
import { CoreModule } from "./core/core.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { JobsModule } from "./jobs/jobs.module";
import { KybModule } from "./kyb/kyb.module";
import { LedgerModule } from "./ledger/ledger.module";
import { MerchantsModule } from "./merchants/merchants.module";
import { MonitoringModule } from "./monitoring/monitoring.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PricingModule } from "./pricing/pricing.module";
import { RailsModule } from "./rails/rails.module";
import {
  CorrelationIdInterceptor,
  IdempotencyInterceptor,
  MerchantContextInterceptor,
  ProblemDetailsFilter,
  validateEnv,
} from "./shared";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { WebhooksModule } from "./webhooks/webhooks.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    ScheduleModule.forRoot(),
    CoreModule,
    MonitoringModule,
    AuthModule,
    MerchantsModule,
    InvoicesModule,
    CheckoutModule,
    SubscriptionsModule,
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
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
    { provide: APP_INTERCEPTOR, useClass: CorrelationIdInterceptor },
    { provide: APP_INTERCEPTOR, useClass: MerchantContextInterceptor },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
})
export class AppModule {}
