import { Module } from "@nestjs/common";
import { RailRouter } from "./rail.router";
import { SETTLEMENT_RAIL_TOKEN } from "./rail.interface";
import { DirectTransferModule } from "./direct-transfer/direct-transfer.module";
import { DirectTransferRail } from "./direct-transfer/direct-transfer.rail";
import { SwapProviderModule } from "./swap-provider/swap-provider.module";
import { SwapProviderRail } from "./swap-provider/swap-provider.rail";

@Module({
  imports: [DirectTransferModule, SwapProviderModule],
  providers: [
    // NestJS has no Angular-style multi-providers; the rail array is
    // assembled here. Adding a rail = adding a module import + factory dep.
    {
      provide: SETTLEMENT_RAIL_TOKEN,
      inject: [DirectTransferRail, SwapProviderRail],
      useFactory: (direct: DirectTransferRail, swap: SwapProviderRail) => [
        direct,
        swap,
      ],
    },
    RailRouter,
  ],
  exports: [RailRouter, DirectTransferModule, SwapProviderModule],
})
export class RailsModule {}
