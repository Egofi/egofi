import { Module } from "@nestjs/common";
import { ProviderHealthService } from "./provider-health.service";
import { ChangeNowAdapter } from "./providers/changenow.adapter";
import { SimpleSwapAdapter } from "./providers/simpleswap.adapter";
import { SwapProviderRail } from "./swap-provider.rail";

@Module({
  providers: [ChangeNowAdapter, SimpleSwapAdapter, ProviderHealthService, SwapProviderRail],
  exports: [SwapProviderRail, ProviderHealthService],
})
export class SwapProviderModule {}
