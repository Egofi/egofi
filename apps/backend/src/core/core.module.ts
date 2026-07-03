import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { RedisService } from "./redis.service";
import { OutboxService } from "./outbox.service";
import { HealthController } from "./health.controller";

@Global()
@Module({
  controllers: [HealthController],
  providers: [PrismaService, RedisService, OutboxService],
  exports: [PrismaService, RedisService, OutboxService],
})
export class CoreModule {}
