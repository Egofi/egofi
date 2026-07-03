import { Module } from "@nestjs/common";
import { KybService } from "./kyb.service";
import { CloudinaryService } from "./cloudinary.service";
import { KybController } from "./kyb.controller";
import { KybAdminController } from "./kyb-admin.controller";

@Module({
  providers: [KybService, CloudinaryService],
  controllers: [KybController, KybAdminController],
  exports: [KybService],
})
export class KybModule {}
