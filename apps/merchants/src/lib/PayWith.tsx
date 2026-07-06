import { cn } from "@egofi/ui";
import { CoinIcon } from "./CoinIcon";
import { iconForAsset, networkOf } from "./crypto-assets";

/** Asset glyph + symbol + network badge — the standard "pay currency" chip. */
export function PayWith({
  asset,
  chain,
  size = 24,
}: {
  asset: string;
  chain: string;
  size?: number;
}) {
  const net = networkOf(chain);
  return (
    <span className="flex items-center gap-2">
      <CoinIcon icon={iconForAsset(asset, chain)} symbol={asset} size={size} />
      <span className="font-medium text-navy-800">{asset}</span>
      <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", net.badge)}>
        {net.label}
      </span>
    </span>
  );
}
