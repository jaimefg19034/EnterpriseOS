import { describe, expect, it } from "vitest";
import { calculateCashForecast, createEmptyCashForecast } from "./cash-forecast";

describe("13-week cash forecast", () => {
  it("rolls the opening balance forward using explicit weekly cash movements", () => {
    const weeks = createEmptyCashForecast(3);
    weeks[0] = { collections: 12000, operatingPayments: 7000, capitalExpenditure: 1000, debtService: 500 };
    weeks[1] = { collections: 4000, operatingPayments: 6500, capitalExpenditure: 0, debtService: 500 };
    weeks[2] = { collections: 0, operatingPayments: 2000, capitalExpenditure: 0, debtService: 0 };
    const result = calculateCashForecast(10000, weeks);
    expect(result.map((week) => week.netCashMovement)).toEqual([3500, -3000, -2000]);
    expect(result.map((week) => week.closingCash)).toEqual([13500, 10500, 8500]);
  });

  it("does not invent cash movements in an empty forecast", () => {
    const result = calculateCashForecast(25000, createEmptyCashForecast(13));
    expect(result).toHaveLength(13);
    expect(result.every((week) => week.netCashMovement === 0 && week.closingCash === 25000)).toBe(true);
  });

  it("sanitizes invalid and negative inputs", () => {
    const result = calculateCashForecast(5000, [{
      collections: -100, operatingPayments: Number.NaN, capitalExpenditure: 200, debtService: 0,
    }]);
    expect(result[0].netCashMovement).toBe(-200);
    expect(result[0].closingCash).toBe(4800);
  });
});
