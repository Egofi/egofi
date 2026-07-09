import { Global, Module } from "@nestjs/common";
import { AuditService } from "./audit.service";
import { CryptoService } from "./crypto.service";
import { HealthController } from "./health.controller";
import { OutboxService } from "./outbox.service";
import { PrismaService } from "./prisma.service";
import { RedisService } from "./redis.service";

@Global()
@Module({
  controllers: [HealthController],
  providers: [PrismaService, RedisService, OutboxService, AuditService, CryptoService],
  exports: [PrismaService, RedisService, OutboxService, AuditService, CryptoService],
})
export class CoreModule {}
