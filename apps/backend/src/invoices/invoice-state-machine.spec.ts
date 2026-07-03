import { describe, expect, it } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { InvoiceState } from "@egofi/types";
import {
  applyTransition,
  canTransition,
  isTerminalState,
} from "./invoice-state-machine";

describe("applyTransition — happy paths", () => {
  it("walks the full swap lifecycle", () => {
    let state: string = InvoiceState.Draft;
    state = applyTransition(state, "issue");
    expect(state).toBe(InvoiceState.AwaitingPayment);
    state = applyTransition(state, "depositDetected");
    expect(state).toBe(InvoiceState.Received);
    state = applyTransition(state, "startConversion");
    expect(state).toBe(InvoiceState.Converting);
    state = applyTransition(state, "payoutSent");
    expect(state).toBe(InvoiceState.PayoutSent);
    state = applyTransition(state, "confirm");
    expect(state).toBe(InvoiceState.PaidConfirmed);
  });

  it("walks the direct-transfer shortcut (no conversion leg)", () => {
    let state: string = InvoiceState.Received;
    state = applyTransition(state, "confirm");
    expect(state).toBe(InvoiceState.PaidConfirmed);
  });

  it("expires and cools down an unpaid invoice", () => {
    let state: string = InvoiceState.AwaitingPayment;
    state = applyTransition(state, "expire");
    expect(state).toBe(InvoiceState.Expired);
    state = applyTransition(state, "cooldown");
    expect(state).toBe(InvoiceState.Cooldown);
  });
});

describe("compliance hold branch (§10.3)", () => {
  it("enters from RECEIVED and from CONVERTING", () => {
    expect(applyTransition(InvoiceState.Received, "complianceHold")).toBe(
      InvoiceState.ComplianceHold,
    );
    expect(applyTransition(InvoiceState.Converting, "complianceHold")).toBe(
      InvoiceState.ComplianceHold,
    );
  });

  it("resumes to CONVERTING when the hold is released", () => {
    expect(applyTransition(InvoiceState.ComplianceHold, "startConversion")).toBe(
      InvoiceState.Converting,
    );
  });

  it("refunds when the customer declines KYC", () => {
    expect(applyTransition(InvoiceState.ComplianceHold, "refund")).toBe(
      InvoiceState.Refunded,
    );
  });

  it("cannot be entered before a deposit exists", () => {
    expect(() =>
      applyTransition(InvoiceState.AwaitingPayment, "complianceHold"),
    ).toThrow(BadRequestException);
  });
});

describe("reorg rule (§12)", () => {
  it("reverts RECEIVED to AWAITING_PAYMENT", () => {
    expect(applyTransition(InvoiceState.Received, "depositReorged")).toBe(
      InvoiceState.AwaitingPayment,
    );
  });

  it("never reverts a confirmed invoice", () => {
    expect(() =>
      applyTransition(InvoiceState.PaidConfirmed, "depositReorged"),
    ).toThrow(BadRequestException);
  });
});

describe("guards", () => {
  it("rejects unknown actions", () => {
    expect(() => applyTransition(InvoiceState.Draft, "teleport" as never)).toThrow(
      BadRequestException,
    );
  });

  it("rejects illegal transitions (idempotent retries surface as errors, not double-applies)", () => {
    // A duplicate "confirm" on an already-confirmed invoice must throw,
    // which is what makes at-least-once webhook delivery safe.
    expect(() =>
      applyTransition(InvoiceState.PaidConfirmed, "confirm"),
    ).toThrow(BadRequestException);
    expect(() =>
      applyTransition(InvoiceState.Draft, "depositDetected"),
    ).toThrow(BadRequestException);
  });

  it("canTransition mirrors applyTransition without throwing", () => {
    expect(canTransition(InvoiceState.Draft, "issue")).toBe(true);
    expect(canTransition(InvoiceState.PaidConfirmed, "confirm")).toBe(false);
    expect(canTransition(InvoiceState.Draft, "teleport" as never)).toBe(false);
  });
});

describe("isTerminalState", () => {
  it("marks the resting states terminal", () => {
    for (const state of [
      InvoiceState.PaidConfirmed,
      InvoiceState.Refunded,
      InvoiceState.Expired,
      InvoiceState.Cooldown,
    ]) {
      expect(isTerminalState(state)).toBe(true);
    }
  });

  it("keeps in-flight and hold states live", () => {
    for (const state of [
      InvoiceState.AwaitingPayment,
      InvoiceState.Received,
      InvoiceState.Converting,
      InvoiceState.ComplianceHold,
      InvoiceState.Failed, // can still move to REFUNDED
      InvoiceState.Underpaid,
    ]) {
      expect(isTerminalState(state)).toBe(false);
    }
  });
});
