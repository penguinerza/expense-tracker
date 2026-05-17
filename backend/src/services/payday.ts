import { isNonWorkingDay } from "./holidays";

/**
 * Calculates the actual payday for a given month.
 * Base: 15th of the month.
 * If 15th is a weekend or Japanese holiday, move to the nearest preceding
 * weekday that is also not a holiday (Japanese payroll convention).
 */
export function getPayday(year: number, month: number): Date {
  // month is 1-based
  let date = new Date(year, month - 1, 15);

  while (isNonWorkingDay(date)) {
    date = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
  }

  return date;
}

export function getPaydayString(year: number, month: number): string {
  const d = getPayday(year, month);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
