import { describe, expect, it } from 'vitest';
import { addDays, holidayMap, type Assignment, type Person } from './domain';
import { assign, MONDAY, person } from './domain/testFixtures';
import { buildWeek } from './planner';
import { buildWeekExportRows, csvCell, rowsToCsv, weekExportFilename } from './exportWeek';

function peopleById(people: readonly Person[]) {
  return new Map(people.map((p) => [p.id, p]));
}

describe('week export', () => {
  it('names the file with the ISO week', () => {
    expect(weekExportFilename('2026-10-26')).toBe('schichtplan-2026-W44.csv');
    expect(weekExportFilename('2025-12-29')).toBe('schichtplan-2026-W01.csv');
    expect(weekExportFilename('2026-12-28')).toBe('schichtplan-2026-W53.csv');
  });

  it('includes empty slots as offen with no person', () => {
    const views = buildWeek(MONDAY, [], [], []);
    const rows = buildWeekExportRows(views, new Map(), []);
    const open = rows.filter((r) => r.status === 'offen');
    expect(open.length).toBeGreaterThan(0);
    expect(open.every((r) => r.person === '' && r.cover === 'nein')).toBe(true);
    expect(rows.some((r) => r.date === MONDAY && r.shift === 'Früh' && r.role === 'Primär')).toBe(
      true,
    );
  });

  it('marks an accepted cover and leaves other rows as nein', () => {
    const coverPerson: Person = person('cover-1', {
      name: 'Taylor, Cover',
      // Other crew, so this person is not in the draft and only appears as a cover.
      crewId: 'crew-2',
      homeRole: 'primary',
      roles: ['primary'],
      homeLine: '1',
      lines: ['1'],
    });
    const cover: Assignment = assign('cover-1', 'primary', '1', 'early', MONDAY);
    const views = buildWeek(MONDAY, [coverPerson], [], [cover]);
    const rows = buildWeekExportRows(views, peopleById([coverPerson]), [cover]);
    const covered = rows.filter((r) => r.cover === 'ja');
    expect(covered).toHaveLength(1);
    const row = covered[0];
    expect(row).toMatchObject({
      date: MONDAY,
      shift: 'Früh',
      line: 'Linie 1',
      role: 'Primär',
      person: 'Taylor, Cover',
      status: 'besetzt',
      cover: 'ja',
    });
    expect(rows.filter((r) => r.cover === 'nein').length).toBe(rows.length - 1);
  });

  it('quotes commas in names and prepends a UTF-8 BOM', () => {
    expect(csvCell('Taylor, Cover')).toBe('"Taylor, Cover"');
    expect(csvCell('plain')).toBe('plain');
    const csv = rowsToCsv([
      {
        date: MONDAY,
        shift: 'Früh',
        line: 'Linie 1',
        role: 'Primär',
        person: 'Taylor, Cover',
        status: 'besetzt',
        cover: 'ja',
      },
    ]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Datum,Schicht,Linie,Rolle,Person,Status,Vertretung');
    expect(csv).toContain('"Taylor, Cover"');
  });

  it('emits one Feiertag row for a mid-week holiday and no slot rows that day', () => {
    const holidays = holidayMap('NW', MONDAY, addDays(MONDAY, 4));
    // 28 Oct 2026 is not a holiday in NRW; force a fake map for Wednesday.
    const wednesday = addDays(MONDAY, 2);
    const map = new Map(holidays);
    map.set(wednesday, 'Einheitstesttag');
    const views = buildWeek(MONDAY, [], [], [], map);
    const rows = buildWeekExportRows(views, new Map(), []);
    const holidayRows = rows.filter((r) => r.date === wednesday);
    expect(holidayRows).toEqual([
      {
        date: wednesday,
        shift: '',
        line: '',
        role: '',
        person: '',
        status: 'Feiertag: Einheitstesttag',
        cover: 'nein',
      },
    ]);
    expect(rows.some((r) => r.date === MONDAY && r.status === 'offen')).toBe(true);
  });
});
