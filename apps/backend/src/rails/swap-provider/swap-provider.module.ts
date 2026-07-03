import { Module } from "@nestjs/common";
import { SwapProviderRail } from "./swap-provider.rail";
import { ChangeNowAdapter } from "./providers/changenow.adapter";
import { SimpleSwapAdapter } from "./providers/simpleswap.adapter";
import { ProviderHealthService } from "./provider-health.service";

@Module({
  providers: [
    ChangeNowAdapter,
    SimpleSwapAdapter,
    ProviderHealthService,
    SwapProviderRail,
  ],
  exports: [SwapProviderRail, ProviderHealthService],
})
export class SwapProviderModule {}
