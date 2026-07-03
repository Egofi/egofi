import { describe, expect, it } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { RailType } from "@egofi/types";
import type { RouteQuery, SettlementRail } from "./rail.interface";
import { RailRouter } from "./rail.router";

function fakeRail(railType: RailType, supports = true): SettlementRail {
  return {
    railType,
    supports: () => supports,
    createPayment: () => Promise.reject(new Error("not under test")),
    getStatus: () => Promise.reject(new Error("not under test")),
    handleWebhook: () => Promise.reject(new Error("not under test")),
  };
}

// Stablecoin amounts: estimateUsd = baseUnits / 1e6
const usd = (amount: number) => BigInt(Math.round(amount * 1e6));

const query = (overrides: Partial<RouteQuery> = {}): RouteQuery => ({
  fromAsset: "USDC",
  fromChain: "BSC",
  toAsset: "USDT",
  toChain: "TRON",
  amountBaseUnits: usd(100),
  ...overrides,
});

describe("RailRouter", () => {
  const direct = fakeRail(RailType.DirectTransfer);
  const swap = fakeRail(RailType.SwapProvider);
  const router = new RailRouter([direct, swap]);

  it("rule 1: same asset + same chain routes direct with no steering note", () => {
    const decision = router.route(
      query({ fromAsset: "USDT", fromChain: "TRON" }),
    );
    expect(decision.rail).toBe(direct);
    expect(decision.steeringNote).toBeUndefined();
  });

  it("rule 2: cross-token below the swap minimum falls back to direct, with an explanation", () => {
    const decision = router.route(query({ amountBaseUnits: usd(10) }));
    expect(decision.rail).toBe(direct);
    expect(decision.steeringNote).toContain("minimum");
  });

  it("rule 2: rejects sub-minimum swaps when no direct alternative exists", () => {
    const swapOnly = new RailRouter([
      fakeRail(RailType.DirectTransfer, false),
      swap,
    ]);
    expect(() => swapOnly.route(query({ amountBaseUnits: usd(10) }))).toThrow(
      BadRequestException,
    );
  });

  it("rule 3: tickets at/above the AML-attention band steer to direct with a customer-visible why", () => {
    const decision = router.route(query({ amountBaseUnits: usd(2_000) }));
    expect(decision.rail).toBe(direct);
    expect(decision.steeringNote).toContain("direct transfer");
  });

  it("rule 3: falls through to swap (flagged) when direct cannot serve the large ticket", () => {
    const swapOnly = new RailRouter([
      fakeRail(RailType.DirectTransfer, false),
      swap,
    ]);
    const decision = swapOnly.route(query({ amountBaseUnits: usd(2_000) }));
    expect(decision.rail).toBe(swap);
    expect(decision.steeringNote).toContain("identity verification");
  });

  it("rule 4: ordinary cross-token routes go to the swap rail", () => {
    const decision = router.route(query({ amountBaseUnits: usd(100) }));
    expect(decision.rail).toBe(swap);
    expect(decision.steeringNote).toBeUndefined();
  });

  it("throws when no rail can serve the route", () => {
    const none = new RailRouter([
      fakeRail(RailType.DirectTransfer, false),
      fakeRail(RailType.SwapProvider, false),
    ]);
    expect(() => none.route(query())).toThrow(BadRequestException);
  });

  it("select() returns just the rail for callers that ignore steering", () => {
    expect(router.select(query())).toBe(swap);
  });
});
