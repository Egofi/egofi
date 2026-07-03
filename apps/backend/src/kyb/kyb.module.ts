import { Module } from "@nestjs/common";
import { CloudinaryService } from "./cloudinary.service";
import { KybAdminController } from "./kyb-admin.controller";
import { KybController } from "./kyb.controller";
import { KybService } from "./kyb.service";

@Module({
  providers: [KybService, CloudinaryService],
  controllers: [KybController, KybAdminController],
  exports: [KybService],
})
export class KybModule {}
