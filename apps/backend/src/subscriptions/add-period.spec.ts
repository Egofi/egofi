import { describe, expect, it } from "vitest";
import { addPeriod } from "./subscriptions.service";

const utc = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const day = (d: Date) => d.toISOString().slice(0, 10);

describe("addPeriod", () => {
  it("advances by days", () => {
    expect(day(addPeriod(utc("2026-01-01"), 1, "DAY"))).toBe("2026-01-02");
    expect(day(addPeriod(utc("2026-01-30"), 5, "DAY"))).toBe("2026-02-04");
  });

  it("advances by weeks", () => {
    expect(day(addPeriod(utc("2026-01-01"), 1, "WEEK"))).toBe("2026-01-08");
    expect(day(addPeriod(utc("2026-01-01"), 4, "WEEK"))).toBe("2026-01-29");
  });

  it("advances by months", () => {
    expect(day(addPeriod(utc("2026-01-15"), 1, "MONTH"))).toBe("2026-02-15");
    expect(day(addPeriod(utc("2026-01-15"), 3, "MONTH"))).toBe("2026-04-15");
  });

  it("defaults an unknown unit to months", () => {
    expect(day(addPeriod(utc("2026-01-15"), 1, "FORTNIGHT"))).toBe("2026-02-15");
  });

  it("advances by years", () => {
    expect(day(addPeriod(utc("2026-03-10"), 1, "YEAR"))).toBe("2027-03-10");
    expect(day(addPeriod(utc("2026-03-10"), 2, "YEAR"))).toBe("2028-03-10");
  });

  it("rolls over the year boundary", () => {
    expect(day(addPeriod(utc("2026-12-15"), 1, "MONTH"))).toBe("2027-01-15");
    expect(day(addPeriod(utc("2026-11-15"), 3, "MONTH"))).toBe("2027-02-15");
  });

  // The whole reason addMonths exists: `setUTCMonth` would overflow Jan 31 into
  // March, silently skipping a subscriber's February invoice.
  it("clamps to the last day of a shorter target month", () => {
    expect(day(addPeriod(utc("2026-01-31"), 1, "MONTH"))).toBe("2026-02-28");
    expect(day(addPeriod(utc("2026-03-31"), 1, "MONTH"))).toBe("2026-04-30");
    expect(day(addPeriod(utc("2026-08-31"), 6, "MONTH"))).toBe("2027-02-28");
  });

  it("clamps into a leap February", () => {
    expect(day(addPeriod(utc("2028-01-31"), 1, "MONTH"))).toBe("2028-02-29");
  });

  it("clamps Feb 29 when adding a year", () => {
    expect(day(addPeriod(utc("2028-02-29"), 1, "YEAR"))).toBe("2029-02-28");
    expect(day(addPeriod(utc("2028-02-29"), 4, "YEAR"))).toBe("2032-02-29");
  });

  it("preserves the time of day", () => {
    const from = new Date("2026-01-15T09:30:45.123Z");
    expect(addPeriod(from, 1, "MONTH").toISOString()).toBe("2026-02-15T09:30:45.123Z");
  });

  it("does not mutate its argument", () => {
    const from = utc("2026-01-31");
    addPeriod(from, 1, "MONTH");
    expect(day(from)).toBe("2026-01-31");
  });
});
