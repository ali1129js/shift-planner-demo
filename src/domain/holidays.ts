import { addDays } from './dates';
import type { IsoDate } from './schemas';

/**
 * Statutory public holidays (gesetzliche Feiertage) per German Bundesland.
 *
 * Source: the Feiertagsgesetze of the 16 states, summarised in the Bundesministerium des
 * Innern overview and the Wikipedia list "Gesetzliche Feiertage in Deutschland".
 * As of 28.11.2026 (includes Frauentag in Berlin since 2019 and in Mecklenburg-Vorpommern
 * since 2023). Not covered on purpose: holidays that apply only in some municipalities
 * (Augsburger Friedensfest, Mariä Himmelfahrt in parts of Bavaria, Fronleichnam in parts of
 * Saxony and Thuringia). Fictional plant, so no real company calendar is modelled.
 */
export const STATES = [
  ['BW', 'Baden-Württemberg'],
  ['BY', 'Bayern'],
  ['BE', 'Berlin'],
  ['BB', 'Brandenburg'],
  ['HB', 'Bremen'],
  ['HH', 'Hamburg'],
  ['HE', 'Hessen'],
  ['MV', 'Mecklenburg-Vorpommern'],
  ['NI', 'Niedersachsen'],
  ['NW', 'Nordrhein-Westfalen'],
  ['RP', 'Rheinland-Pfalz'],
  ['SL', 'Saarland'],
  ['SN', 'Sachsen'],
  ['ST', 'Sachsen-Anhalt'],
  ['SH', 'Schleswig-Holstein'],
  ['TH', 'Thüringen'],
] as const;

export type StateCode = (typeof STATES)[number][0];

/** The fictional plant is placed in this state unless the planner picks another one. */
export const DEFAULT_STATE: StateCode = 'NW';

export const HOLIDAYS_AS_OF = '28.11.2026';
export const HOLIDAYS_SOURCE =
  'Feiertagsgesetze der Länder (Übersicht: Wikipedia "Gesetzliche Feiertage in Deutschland")';

export function isStateCode(v: unknown): v is StateCode {
  return STATES.some(([code]) => code === v);
}

export function stateName(code: StateCode): string {
  return STATES.find(([c]) => c === code)?.[1] ?? code;
}

/** Easter Sunday (Gregorian computus, Meeus/Jones/Butcher). */
export function easterSunday(year: number): IsoDate {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const pad = (n: number) => String(n).padStart(2, '0');
const fixed = (year: number, month: number, day: number): IsoDate =>
  `${year}-${pad(month)}-${pad(day)}`;

/** Wednesday before 23 November (Buß- und Bettag). */
function bussUndBettag(year: number): IsoDate {
  const nov23 = fixed(year, 11, 23);
  const wd = (new Date(`${nov23}T00:00:00Z`).getUTCDay() + 6) % 7; // 0 = Monday
  // Wednesday is index 2; go back 1..7 days, never 0.
  const back = (wd - 2 + 7) % 7 || 7;
  return addDays(nov23, -back);
}

const in_ = (states: readonly StateCode[], s: StateCode) => states.includes(s);

/** All statutory holidays of a state in a year, sorted by date. */
export function holidaysFor(
  state: StateCode,
  year: number,
): Array<{ date: IsoDate; name: string }> {
  const easter = easterSunday(year);
  const list: Array<{ date: IsoDate; name: string }> = [
    { date: fixed(year, 1, 1), name: 'Neujahr' },
    { date: addDays(easter, -2), name: 'Karfreitag' },
    { date: addDays(easter, 1), name: 'Ostermontag' },
    { date: fixed(year, 5, 1), name: 'Tag der Arbeit' },
    { date: addDays(easter, 39), name: 'Christi Himmelfahrt' },
    { date: addDays(easter, 50), name: 'Pfingstmontag' },
    { date: fixed(year, 10, 3), name: 'Tag der Deutschen Einheit' },
    { date: fixed(year, 12, 25), name: '1. Weihnachtstag' },
    { date: fixed(year, 12, 26), name: '2. Weihnachtstag' },
  ];
  const add = (date: IsoDate, name: string) => list.push({ date, name });

  if (in_(['BW', 'BY', 'ST'], state)) add(fixed(year, 1, 6), 'Heilige Drei Könige');
  if (state === 'BE' && year >= 2019) add(fixed(year, 3, 8), 'Internationaler Frauentag');
  if (state === 'MV' && year >= 2023) add(fixed(year, 3, 8), 'Internationaler Frauentag');
  if (state === 'BB') {
    add(easter, 'Ostersonntag');
    add(addDays(easter, 49), 'Pfingstsonntag');
  }
  if (in_(['BW', 'BY', 'HE', 'NW', 'RP', 'SL'], state)) add(addDays(easter, 60), 'Fronleichnam');
  if (state === 'SL') add(fixed(year, 8, 15), 'Mariä Himmelfahrt');
  if (state === 'TH') add(fixed(year, 9, 20), 'Weltkindertag');
  if (in_(['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH'], state))
    add(fixed(year, 10, 31), 'Reformationstag');
  if (in_(['BW', 'BY', 'NW', 'RP', 'SL'], state)) add(fixed(year, 11, 1), 'Allerheiligen');
  if (state === 'SN') add(bussUndBettag(year), 'Buß- und Bettag');

  return list.sort((a, b) => a.date.localeCompare(b.date));
}

/** Date to holiday name for every year touched by [from, to]. */
export function holidayMap(
  state: StateCode,
  from: IsoDate,
  to: IsoDate,
): ReadonlyMap<IsoDate, string> {
  const map = new Map<IsoDate, string>();
  const y1 = Number(from.slice(0, 4));
  const y2 = Number(to.slice(0, 4));
  for (let y = y1; y <= y2; y++) {
    for (const h of holidaysFor(state, y)) map.set(h.date, h.name);
  }
  return map;
}
