import { describe, expect, it } from 'vitest';
import { generateDemoData } from './domain';
import { buildWeek, gapRoles, lineSlots, shortReason, statusOf, weekDates } from './planner';

describe('planner helpers', () => {
  it('lists Mon-Fri dates', () => {
    expect(weekDates('2026-10-26')).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
    ]);
  });
  it('derives the worst status', () => {
    expect(statusOf([])).toBe('ok');
    expect(statusOf([{ severity: 'info', code: 'x', message: '' }])).toBe('ok');
    expect(
      statusOf([
        { severity: 'warning', code: 'x', message: '' },
        { severity: 'error', code: 'y', message: '' },
      ]),
    ).toBe('error');
  });
  it('maps gap issues to roles, most urgent first, without duplicates', () => {
    const roles = gapRoles([
      { severity: 'error', code: 'primary-missing', message: '' },
      { severity: 'warning', code: 'secondary-below-optimal', message: '' },
      { severity: 'error', code: 'secondary-missing', message: '' },
    ]);
    expect(roles).toEqual(['primary', 'secondary']);
  });
  it('builds 15 shift views and includes accepted covers', () => {
    const { people, absences } = generateDemoData({ referenceDate: '2026-10-26' });
    const extra = {
      date: '2026-10-26',
      shift: 'early',
      line: '1',
      role: 'secondary',
      personId: 'p999',
    } as const;
    const week = buildWeek('2026-10-26', people, absences, [extra]);
    expect(week).toHaveLength(15);
    expect(week[0]?.assignments).toContainEqual(extra);
  });
});

describe('line slots', () => {
  const base = { date: '2026-10-26', shift: 'early', crew: 'crew-1' } as const;
  const report = (issues: import('./domain').StaffingIssue[]) => ({
    ...base,
    issues,
    errors: 0,
    warnings: 0,
    ok: true,
  });
  it('marks missing roles and an optional 2nd Secondary', () => {
    const view = {
      ...base,
      assignments: [
        { date: base.date, shift: base.shift, line: '1', role: 'secondary', personId: 'x' },
      ],
      report: report([]),
    } as const;
    const s = lineSlots({ ...view, assignments: [...view.assignments] }, '1');
    expect(s.lineLeader[0]).toMatchObject({ state: 'missing', severity: 'error' });
    expect(s.primary[0]).toMatchObject({ state: 'missing', severity: 'error' });
    expect(s.mechanic[0]).toMatchObject({ state: 'missing', severity: 'warning' });
    expect(s.secondary.map((x) => x.state)).toEqual(['filled', 'optional']);
  });
  it('gives short reasons with a count of further problems', () => {
    expect(shortReason([])).toBe('OK');
    expect(
      shortReason([
        { severity: 'warning', code: 'secondary-below-optimal', message: '' },
        { severity: 'error', code: 'primary-missing', message: '' },
      ]),
    ).toBe('Kein Primär +1');
  });
});
