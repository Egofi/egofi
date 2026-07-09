import { copyFileSync, existsSync, mkdirSync } from "node:fs";
// Copies the coin glyphs we use from the `cryptocurrency-icons` package into
// public/crypto-icons so <CoinIcon> can serve them as static assets (offline,
// no bundler config). Re-run after changing the pay-currency catalog:
//   pnpm --filter @egofi/merchants sync:icons
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

// Tickers referenced by src/lib/crypto-assets.ts (+ generic fallback).
const TICKERS = ["btc", "eth", "usdt", "usdc", "bnb", "sol", "trx", "matic", "ltc", "generic"];

const pkgDir = dirname(require.resolve("cryptocurrency-icons/package.json"));
const srcDir = join(pkgDir, "svg", "color");

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "public", "crypto-icons");
mkdirSync(outDir, { recursive: true });

let copied = 0;
const missing = [];
for (const ticker of TICKERS) {
  const src = join(srcDir, `${ticker}.svg`);
  if (existsSync(src)) {
    copyFileSync(src, join(outDir, `${ticker}.svg`));
    copied += 1;
  } else {
    missing.push(ticker);
  }
}

console.log(`Copied ${copied} crypto icons → public/crypto-icons`);
if (missing.length) console.warn(`Missing (falls back to letter badge): ${missing.join(", ")}`);
