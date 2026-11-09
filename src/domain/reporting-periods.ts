export type ReportingPeriodCode = "FY" | "Q1" | "Q2" | "Q3" | "Q4";

export type ReportingPeriodBounds = {
  start: string;
  end: string;
  totalDays: number;
};

function createUTCDate(year: number, monthIndex: number, day: number): Date {
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, monthIndex, day);
  return date;
}

/** Parses a strict YYYY-MM-DD date as a UTC calendar date (never local time). */
export function parseISODateUTC(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1) return null;
  const date = createUTCDate(year, month - 1, day);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;
  return date;
}

export function isValidISODate(value: unknown): value is string {
  return typeof value === "string" && parseISODateUTC(value) !== null;
}

function toISODateUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Returns inclusive reporting-period bounds. The year labels the year in
 * which the financial year starts; startMonth=1 means a calendar financial
 * year, while startMonth=4 means 1 April through 31 March.
 */
export function getReportingPeriodBounds(
  year: number,
  period: ReportingPeriodCode,
  fiscalYearStartMonth = 1,
): ReportingPeriodBounds | null {
  if (
    !Number.isInteger(year) ||
    year < 1 ||
    year > 9998 ||
    !Number.isInteger(fiscalYearStartMonth) ||
    fiscalYearStartMonth < 1 ||
    fiscalYearStartMonth > 12
  ) return null;

  if (!["FY", "Q1", "Q2", "Q3", "Q4"].includes(period)) return null;
  const quarterIndex = period === "FY" ? 0 : Number(period.slice(1)) - 1;
  if (period !== "FY" && (!Number.isInteger(quarterIndex) || quarterIndex < 0 || quarterIndex > 3)) return null;

  const startMonthIndex = fiscalYearStartMonth - 1 + quarterIndex * 3;
  const start = createUTCDate(year, startMonthIndex, 1);
  const end = period === "FY"
    ? createUTCDate(year, fiscalYearStartMonth - 1 + 12, 0)
    : createUTCDate(year, startMonthIndex + 3, 0);
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;

  return {
    start: toISODateUTC(start),
    end: toISODateUTC(end),
    totalDays,
  };
}

export function isDateWithinReportingPeriod(
  date: string,
  bounds: ReportingPeriodBounds,
): boolean {
  return isValidISODate(date) && date >= bounds.start && date <= bounds.end;
}

export function inclusiveDaysBetween(start: string, end: string): number {
  const startDate = parseISODateUTC(start);
  const endDate = parseISODateUTC(end);
  if (!startDate || !endDate || endDate < startDate) return 0;
  return Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
}

/** Checks a YYYY-Qn or YYYY-FY code against a date using the shared calendar rules. */
export function isDateWithinReportingPeriodCode(
  date: string,
  periodCode: string,
  fiscalYearStartMonth = 1,
): boolean {
  const match = /^(\\d{4})-(FY|Q[1-4])$/.exec(periodCode);
  if (!match) return false;
  const bounds = getReportingPeriodBounds(
    Number(match[1]),
    match[2] as ReportingPeriodCode,
    fiscalYearStartMonth,
  );
  return bounds !== null && isDateWithinReportingPeriod(date, bounds);
}
