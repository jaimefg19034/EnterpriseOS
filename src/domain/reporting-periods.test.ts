import { describe, expect, it } from "vitest";
import {
  getReportingPeriodBounds,
  inclusiveDaysBetween,
  isDateWithinReportingPeriod,
  isDateWithinReportingPeriodCode,
  isValidISODate,
  isValidReportingPeriodCode,
} from "./reporting-periods";

describe("shared reporting-period boundaries", () => {
  it("uses inclusive calendar-year bounds and accounts for leap years", () => {
    expect(getReportingPeriodBounds(2024, "FY")).toEqual({
      start: "2024-01-01",
      end: "2024-12-31",
      totalDays: 366,
    });
    expect(getReportingPeriodBounds(2025, "FY")?.totalDays).toBe(365);
  });

  it("calculates quarter boundaries across month lengths and year transitions", () => {
    expect(getReportingPeriodBounds(2024, "Q1")).toEqual({
      start: "2024-01-01",
      end: "2024-03-31",
      totalDays: 91,
    });
    expect(getReportingPeriodBounds(2025, "Q1")?.totalDays).toBe(90);
    expect(getReportingPeriodBounds(2026, "Q4")).toEqual({
      start: "2026-10-01",
      end: "2026-12-31",
      totalDays: 92,
    });
  });

  it("supports non-calendar financial years and fiscal quarters", () => {
    expect(getReportingPeriodBounds(2026, "FY", 4)).toEqual({
      start: "2026-04-01",
      end: "2027-03-31",
      totalDays: 365,
    });
    expect(getReportingPeriodBounds(2023, "FY", 4)?.totalDays).toBe(366);
    expect(getReportingPeriodBounds(2026, "Q4", 4)).toEqual({
      start: "2027-01-01",
      end: "2027-03-31",
      totalDays: 90,
    });
  });

  it("rejects impossible dates and invalid period parameters", () => {
    expect(isValidISODate("2024-02-29")).toBe(true);
    expect(isValidISODate("2025-02-29")).toBe(false);
    expect(isValidISODate("2026-04-31")).toBe(false);
    expect(isValidISODate("0000-01-01")).toBe(false);
    expect(isValidReportingPeriodCode("2026-Q4")).toBe(true);
    expect(isValidReportingPeriodCode("2026-Q5")).toBe(false);
    expect(isValidReportingPeriodCode("0000-FY")).toBe(false);
    expect(isDateWithinReportingPeriodCode("2026-10-01", "2026-Q4")).toBe(true);
    expect(isDateWithinReportingPeriodCode("2026-09-30", "2026-Q4")).toBe(false);
    expect(isDateWithinReportingPeriodCode("2027-01-15", "2026-FY", 4)).toBe(true);
    expect(isValidISODate("2026-2-01")).toBe(false);
    expect(getReportingPeriodBounds(2026, "Q5" as "Q1")).toBeNull();
    expect(getReportingPeriodBounds(2026, "FY", 13)).toBeNull();
    expect(getReportingPeriodBounds(0, "FY")).toBeNull();
  });

  it("includes both endpoints and never includes an adjacent period date", () => {
    const q1 = getReportingPeriodBounds(2026, "Q1")!;
    expect(isDateWithinReportingPeriod("2026-01-01", q1)).toBe(true);
    expect(isDateWithinReportingPeriod("2026-03-31", q1)).toBe(true);
    expect(isDateWithinReportingPeriod("2026-04-01", q1)).toBe(false);
    expect(inclusiveDaysBetween("2024-02-28", "2024-03-01")).toBe(3);
    expect(inclusiveDaysBetween("2026-03-02", "2026-03-01")).toBe(0);
    expect(inclusiveDaysBetween("invalid", "2026-03-01")).toBe(0);
  });
});
