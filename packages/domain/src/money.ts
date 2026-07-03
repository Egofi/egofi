/**
 * Money as integer base units (§0.4: everything typed, nothing floats).
 * Decimals are per-token metadata, never assumptions (§6) — a Money value
 * always carries the decimals it was constructed with.
 */
export type Money = {
  readonly baseUnits: bigint;
  readonly decimals: number;
  readonly asset: string;
};

export function money(baseUnits: bigint, decimals: number, asset: string): Money {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    throw new RangeError(`Invalid decimals: ${decimals}`);
  }
  return { baseUnits, decimals, asset };
}

/** Parses a decimal string ("12.34") into base units without ever touching floats. */
export function parseMoney(value: string, decimals: number, asset: string): Money {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) throw new SyntaxError(`Invalid money string: "${value}"`);
  const [, sign, whole, fractionRaw = ""] = match;
  if (fractionRaw.length > decimals) {
    throw new RangeError(
      `"${value}" has more fractional digits than ${asset}'s ${decimals} decimals`,
    );
  }
  const fraction = fractionRaw.padEnd(decimals, "0");
  const units = BigInt(whole ?? "0") * 10n ** BigInt(decimals) + BigInt(fraction || "0");
  return money(sign === "-" ? -units : units, decimals, asset);
}

/** Formats base units back to a decimal string, no floats involved. */
export function formatMoney(value: Money): string {
  const negative = value.baseUnits < 0n;
  const abs = negative ? -value.baseUnits : value.baseUnits;
  const divisor = 10n ** BigInt(value.decimals);
  const whole = abs / divisor;
  const fraction = (abs % divisor).toString().padStart(value.decimals, "0");
  const trimmed = fraction.replace(/0+$/, "");
  const body = trimmed.length > 0 ? `${whole}.${trimmed}` : whole.toString();
  return negative ? `-${body}` : body;
}

export function addMoney(a: Money, b: Money): Money {
  assertSameUnit(a, b);
  return money(a.baseUnits + b.baseUnits, a.decimals, a.asset);
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameUnit(a, b);
  return money(a.baseUnits - b.baseUnits, a.decimals, a.asset);
}

export function compareMoney(a: Money, b: Money): -1 | 0 | 1 {
  assertSameUnit(a, b);
  if (a.baseUnits < b.baseUnits) return -1;
  if (a.baseUnits > b.baseUnits) return 1;
  return 0;
}

function assertSameUnit(a: Money, b: Money): void {
  if (a.asset !== b.asset || a.decimals !== b.decimals) {
    throw new TypeError(`Cannot combine ${a.asset}(${a.decimals}) with ${b.asset}(${b.decimals})`);
  }
}
