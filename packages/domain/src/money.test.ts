import { describe, expect, it } from "vitest";
import { addMoney, compareMoney, formatMoney, money, parseMoney, subtractMoney } from "./money";

describe("parseMoney", () => {
  it("parses whole amounts into base units", () => {
    expect(parseMoney("100", 6, "USDT").baseUnits).toBe(100_000_000n);
  });

  it("parses fractional amounts without floats", () => {
    expect(parseMoney("12.34", 6, "USDT").baseUnits).toBe(12_340_000n);
    expect(parseMoney("0.000001", 6, "USDT").baseUnits).toBe(1n);
  });

  it("parses negative amounts", () => {
    expect(parseMoney("-5.5", 6, "USDT").baseUnits).toBe(-5_500_000n);
  });

  it("handles amounts beyond Number.MAX_SAFE_INTEGER precisely", () => {
    // 18-decimal token with a large balance — floats would corrupt this
    const parsed = parseMoney("123456789.123456789012345678", 18, "ETH");
    expect(parsed.baseUnits).toBe(123456789123456789012345678n);
  });

  it("rejects more fractional digits than the token's decimals", () => {
    expect(() => parseMoney("1.1234567", 6, "USDT")).toThrow(RangeError);
  });

  it("rejects garbage input", () => {
    expect(() => parseMoney("12,34", 6, "USDT")).toThrow(SyntaxError);
    expect(() => parseMoney("abc", 6, "USDT")).toThrow(SyntaxError);
    expect(() => parseMoney("", 6, "USDT")).toThrow(SyntaxError);
    expect(() => parseMoney("1e5", 6, "USDT")).toThrow(SyntaxError);
  });
});

describe("formatMoney", () => {
  it("round-trips with parseMoney", () => {
    for (const value of ["0", "1", "12.34", "0.000001", "-5.5", "1000000"]) {
      expect(formatMoney(parseMoney(value, 6, "USDT"))).toBe(value);
    }
  });

  it("trims trailing fractional zeros", () => {
    expect(formatMoney(money(1_500_000n, 6, "USDT"))).toBe("1.5");
  });
});

describe("arithmetic", () => {
  const a = parseMoney("10.5", 6, "USDT");
  const b = parseMoney("2.25", 6, "USDT");

  it("adds and subtracts in base units", () => {
    expect(formatMoney(addMoney(a, b))).toBe("12.75");
    expect(formatMoney(subtractMoney(a, b))).toBe("8.25");
  });

  it("compares correctly", () => {
    expect(compareMoney(a, b)).toBe(1);
    expect(compareMoney(b, a)).toBe(-1);
    expect(compareMoney(a, a)).toBe(0);
  });

  it("refuses to combine different assets or decimals", () => {
    const usdc = parseMoney("1", 6, "USDC");
    const eth = parseMoney("1", 18, "ETH");
    expect(() => addMoney(a, usdc)).toThrow(TypeError);
    expect(() => addMoney(a, eth)).toThrow(TypeError);
  });
});

describe("money constructor", () => {
  it("rejects invalid decimals", () => {
    expect(() => money(1n, -1, "X")).toThrow(RangeError);
    expect(() => money(1n, 37, "X")).toThrow(RangeError);
    expect(() => money(1n, 1.5, "X")).toThrow(RangeError);
  });
});
