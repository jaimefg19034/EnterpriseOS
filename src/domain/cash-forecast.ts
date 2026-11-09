export type CashForecastWeekInput = {
  collections: number;
  operatingPayments: number;
  capitalExpenditure: number;
  debtService: number;
};

export type CashForecastWeekResult = CashForecastWeekInput & {
  netCashMovement: number;
  closingCash: number;
};

/** Calculates a rolling direct-method cash forecast from explicit weekly inputs. */
export function calculateCashForecast(
  openingCash: number,
  weeks: CashForecastWeekInput[],
): CashForecastWeekResult[] {
  let cash = Number.isFinite(openingCash) ? openingCash : 0;
  return weeks.map((week) => {
    const collections = Math.max(0, Number.isFinite(week.collections) ? week.collections : 0);
    const operatingPayments = Math.max(0, Number.isFinite(week.operatingPayments) ? week.operatingPayments : 0);
    const capitalExpenditure = Math.max(0, Number.isFinite(week.capitalExpenditure) ? week.capitalExpenditure : 0);
    const debtService = Math.max(0, Number.isFinite(week.debtService) ? week.debtService : 0);
    const netCashMovement = collections - operatingPayments - capitalExpenditure - debtService;
    cash = Math.round((cash + netCashMovement + Number.EPSILON) * 100) / 100;
    return {
      collections,
      operatingPayments,
      capitalExpenditure,
      debtService,
      netCashMovement: Math.round((netCashMovement + Number.EPSILON) * 100) / 100,
      closingCash: cash,
    };
  });
}

export function createEmptyCashForecast(weekCount = 13): CashForecastWeekInput[] {
  return Array.from({ length: Math.max(0, Math.floor(weekCount)) }, () => ({
    collections: 0,
    operatingPayments: 0,
    capitalExpenditure: 0,
    debtService: 0,
  }));
}
