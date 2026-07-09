import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { currentMerchantId } from "./merchant-context";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    // Prisma 6 removed `$use` middleware. Tenant isolation is enforced at the
    // service layer (every merchant query filters on `merchantId`) and, for raw
    // SQL, via `setRlsContext()` below.
    await this.$connect();
    this.logger.log("Prisma connected");
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Sets the PostgreSQL session variable for RLS. Call this inside a
   * transaction/raw-query block before issuing tenant-protected raw SQL.
   */
  async setRlsContext(): Promise<void> {
    const merchantId = currentMerchantId();
    if (merchantId) {
      await this.$executeRaw`SELECT set_config('app.current_merchant_id', ${merchantId}, true)`;
    }
  }
}
