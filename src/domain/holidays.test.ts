import { describe, expect, it } from 'vitest';
import { checkShift } from './staffing';
import { draftShiftAssignments } from './defaultPlan';
import { generateDemoData } from './demoData';
import { isWorkingDay } from './calendar';
import {
  DEFAULT_STATE,
  STATES,
  easterSunday,
  holidayMap,
  holidaysFor,
  isStateCode,
  type StateCode,
} from './holidays';

const dates = (s: StateCode, y: number) => holidaysFor(s, y).map((h) => h.date);

describe('easterSunday', () => {
  it('matches known dates', () => {
    expect(easterSunday(2025)).toBe('2025-04-20');
    expect(easterSunday(2026)).toBe('2026-04-05');
    expect(easterSunday(2027)).toBe('2027-03-28');
    expect(easterSunday(2038)).toBe('2038-04-25');
  });
});

describe('holidaysFor', () => {
  it('has nine nationwide holidays in every state, sorted', () => {
    for (const [code] of STATES) {
      const list = dates(code, 2026);
      for (const d of ['2026-01-01', '2026-04-03', '2026-04-06', '2026-05-01', '2026-05-14']) {
        expect(list, `${code} ${d}`).toContain(d);
      }
      expect(list).toContain('2026-05-25'); // Pfingstmontag
      expect(list).toContain('2026-10-03');
      expect(list).toContain('2026-12-25');
      expect(list).toContain('2026-12-26');
      expect([...list].sort()).toEqual(list);
    }
  });
  it('knows the state-specific days for 2026', () => {
    expect(dates('NW', 2026)).toContain('2026-06-04'); // Fronleichnam
    expect(dates('NW', 2026)).toContain('2026-11-01'); // Allerheiligen
    expect(dates('NW', 2026)).not.toContain('2026-10-31');
    expect(dates('BE', 2026)).toContain('2026-03-08');
    expect(dates('BE', 2026)).not.toContain('2026-06-04');
    expect(dates('BB', 2026)).toEqual(
      expect.arrayContaining(['2026-04-05', '2026-05-24', '2026-10-31']),
    );
    expect(dates('SN', 2026)).toContain('2026-11-18'); // Buß- und Bettag
    expect(dates('TH', 2026)).toContain('2026-09-20');
    expect(dates('BY', 2026)).toContain('2026-01-06');
    expect(dates('SL', 2026)).toContain('2026-08-15');
  });
  it('counts per state match the statutory lists (2026)', () => {
    const counts = Object.fromEntries(STATES.map(([c]) => [c, dates(c, 2026).length]));
    expect(counts).toMatchObject({
      BW: 12,
      BY: 12,
      BE: 10,
      BB: 12,
      HB: 10,
      HH: 10,
      HE: 10,
      MV: 11,
      NI: 10,
      NW: 11,
      RP: 11,
      SL: 12,
      SN: 11,
      ST: 11,
      SH: 10,
      TH: 11,
    });
  });
  it('Buß- und Bettag is always the Wednesday before 23 November', () => {
    for (const y of [2024, 2025, 2026, 2027, 2028]) {
      const d = dates('SN', y).find((x) => x.startsWith(`${y}-11`)) ?? '';
      expect(new Date(`${d}T00:00:00Z`).getUTCDay()).toBe(3);
      expect(d < `${y}-11-23`).toBe(true);
      expect(d >= `${y}-11-16`).toBe(true);
    }
  });
  it('defaults to a valid state', () => {
    expect(isStateCode(DEFAULT_STATE)).toBe(true);
    expect(isStateCode('XX')).toBe(false);
  });
});

describe('holidayMap', () => {
  it('spans a year boundary and names the day', () => {
    const m = holidayMap('NW', '2026-12-28', '2027-01-01');
    expect(m.get('2027-01-01')).toBe('Neujahr');
    expect(m.size).toBeGreaterThan(0);
  });
});

describe('a mid-week holiday in the staffing domain', () => {
  const { people, absences } = generateDemoData({ referenceDate: '2026-06-01' });
  it('is non-working, drafts nothing and raises no staffing errors', () => {
    const hol = ['2026-06-04']; // Thursday, Fronleichnam in NW
    expect(isWorkingDay('2026-06-04', hol)).toBe(false);
    expect(draftShiftAssignments('2026-06-04', 'early', people, absences, hol)).toEqual([]);
    const r = checkShift('2026-06-04', 'early', {
      people,
      absences,
      assignments: [],
      holidays: hol,
    });
    expect(r.errors + r.warnings).toBe(0);
  });
});
