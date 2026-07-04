"use client";

import { useEffect, useState } from "react";

// Deterministic pastel background for the fallback badge, keyed off the symbol.
const FALLBACK_TINTS = [
  "bg-primary-100 text-primary-700",
  "bg-amber-100 text-amber-800",
  "bg-teal-100 text-teal-700",
  "bg-purple-100 text-purple-700",
  "bg-rose-100 text-rose-700",
  "bg-indigo-100 text-indigo-700",
];

function tintFor(symbol: string): string {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) hash = (hash * 31 + symbol.charCodeAt(i)) >>> 0;
  return FALLBACK_TINTS[hash % FALLBACK_TINTS.length] as string;
}

/**
 * Renders a crypto glyph from public/crypto-icons (synced from the
 * `cryptocurrency-icons` package). Robust by design: if the asset has no icon
 * (or the file 404s), it degrades to a colored badge with the ticker initials —
 * so an unknown/new asset never renders a broken image.
 */
export function CoinIcon({
  icon,
  symbol,
  size = 28,
}: {
  icon: string;
  symbol: string;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);

  // Reset when the coin changes so a previously-failed icon can retry.
  useEffect(() => setBroken(false), []);

  if (broken || !icon) {
    const initials = symbol
      .replace(/[^a-z0-9]/gi, "")
      .slice(0, 3)
      .toUpperCase();
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${tintFor(symbol)}`}
        style={{ width: size, height: size, fontSize: Math.max(9, size * 0.32) }}
        aria-hidden
      >
        {initials}
      </span>
    );
  }

  return (
    <img
      src={`/crypto-icons/${icon}.svg`}
      width={size}
      height={size}
      alt=""
      aria-hidden
      className="shrink-0 rounded-full"
      onError={() => setBroken(true)}
    />
  );
}
