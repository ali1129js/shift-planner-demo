import type { IsoDate } from './schemas';

/** Parse an ISO date as a UTC midnight timestamp (avoids DST/timezone drift). */
export function parseIsoDate(date: IsoDate): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1));
}

export function toIsoDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const d = parseIsoDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoDate(d);
}

/** 0 = Monday ... 6 = Sunday. */
export function weekdayIndex(date: IsoDate): number {
  return (parseIsoDate(date).getUTCDay() + 6) % 7;
}

export function mondayOf(date: IsoDate): IsoDate {
  return addDays(date, -weekdayIndex(date));
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / 86_400_000);
}
