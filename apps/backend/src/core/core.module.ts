import { Global, Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { OutboxService } from "./outbox.service";
import { PrismaService } from "./prisma.service";
import { RedisService } from "./redis.service";

@Global()
@Module({
  controllers: [HealthController],
  providers: [PrismaService, RedisService, OutboxService],
  exports: [PrismaService, RedisService, OutboxService],
})
export class CoreModule {}
