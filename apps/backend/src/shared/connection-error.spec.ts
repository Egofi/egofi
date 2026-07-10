import { describe, expect, it } from "vitest";
import { ErrorThrottle, isTransportError } from "./connection-error";

describe("isTransportError", () => {
  it("recognises a dropped socket", () => {
    expect(isTransportError(Object.assign(new Error("x"), { code: "ECONNRESET" }))).toBe(true);
    expect(isTransportError(Object.assign(new Error("x"), { code: "ECONNABORTED" }))).toBe(true);
    expect(isTransportError(Object.assign(new Error("x"), { code: "ECONNREFUSED" }))).toBe(true);
  });

  it("does not swallow application errors", () => {
    expect(isTransportError(new Error("boom"))).toBe(false);
    expect(isTransportError(Object.assign(new Error("x"), { code: "ERR_INVALID_ARG" }))).toBe(
      false,
    );
    expect(isTransportError(undefined)).toBe(false);
    expect(isTransportError("ECONNRESET")).toBe(false);
  });
});

describe("ErrorThrottle", () => {
  it("reports the first error immediately", () => {
    const t = new ErrorThrottle(30_000);
    expect(t.next(1_000)).toEqual({ suppressed: 0 });
  });

  it("swallows repeats inside the window and counts them", () => {
    const t = new ErrorThrottle(30_000);
    t.next(0);
    expect(t.next(1_000)).toBeNull();
    expect(t.next(2_000)).toBeNull();
    expect(t.next(29_999)).toBeNull();
    expect(t.next(30_000)).toEqual({ suppressed: 3 });
  });

  it("starts a fresh count after each report", () => {
    const t = new ErrorThrottle(10);
    t.next(0);
    t.next(1);
    expect(t.next(10)).toEqual({ suppressed: 1 });
    expect(t.next(11)).toBeNull();
    expect(t.next(20)).toEqual({ suppressed: 1 });
  });

  it("reports immediately again once reset (connection recovered)", () => {
    const t = new ErrorThrottle(30_000);
    t.next(0);
    expect(t.next(1_000)).toBeNull();
    t.reset();
    expect(t.next(1_001)).toEqual({ suppressed: 0 });
  });
});
