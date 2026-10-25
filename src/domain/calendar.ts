import { weekdayIndex } from './dates';
import type { IsoDate } from './schemas';

/**
 * Shifts run Monday to Friday. A shift is identified by the date it starts on, so the
 * Friday night shift (21:45 Fri - 06:00 Sat) belongs to Friday. No work on weekends or
 * on the configured holidays.
 */
export function isWorkingDay(date: IsoDate, holidays: readonly IsoDate[] = []): boolean {
  return weekdayIndex(date) < 5 && !holidays.includes(date);
}
