// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ABSENCES_KEY,
  loadAbsences,
  nextAbsenceId,
  saveAbsences,
  validateAbsence,
} from './absences';
import { checkShift, draftShiftAssignments, type Absence } from './domain';
import { MONDAY, person } from './domain/testFixtures';

const people = [person('p1'), person('p2')];
const existing: Absence[] = [
  { id: 'a1', personId: 'p1', type: 'vacation', from: '2026-10-26', to: '2026-10-28' },
];
const input = (over = {}) => ({
  personId: 'p2',
  type: 'sick',
  from: '2026-10-26',
  to: '2026-10-27',
  ...over,
});

describe('validateAbsence', () => {
  it('accepts a valid absence and assigns the id', () => {
    const r = validateAbsence(input(), people, existing, 'a2');
    expect(r).toEqual({
      ok: true,
      absence: { id: 'a2', personId: 'p2', type: 'sick', from: '2026-10-26', to: '2026-10-27' },
    });
  });
  it('allows a single-day absence (from = to, inclusive)', () => {
    expect(validateAbsence(input({ to: '2026-10-26' }), people, existing, 'a2').ok).toBe(true);
  });
  it('rejects to before from', () => {
    const r = validateAbsence(input({ to: '2026-10-25' }), people, existing, 'a2');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.to).toMatch(/nicht vor/);
  });
  it('rejects unknown and empty persons', () => {
    const r = validateAbsence(input({ personId: 'nobody' }), people, existing, 'a2');
    if (r.ok) throw new Error('expected error');
    expect(r.errors.personId).toMatch(/gibt es nicht/);
    const e = validateAbsence(input({ personId: '' }), people, existing, 'a2');
    if (e.ok) throw new Error('expected error');
    expect(e.errors.personId).toMatch(/auswählen/);
  });
  it('rejects unknown types and malformed dates', () => {
    const r = validateAbsence(input({ type: 'party', from: '26.10.2026' }), people, [], 'a2');
    if (r.ok) throw new Error('expected error');
    expect(r.errors.type).toBeDefined();
    expect(r.errors.from).toBeDefined();
  });
  it('rejects overlap for the same person, including touching edges', () => {
    const r = validateAbsence(
      input({ personId: 'p1', from: '2026-10-28', to: '2026-10-30' }),
      people,
      existing,
      'a2',
    );
    if (r.ok) throw new Error('expected error');
    expect(r.errors.from).toMatch(/Überschneidet/);
    expect(
      validateAbsence(
        input({ personId: 'p1', from: '2026-10-29', to: '2026-10-29' }),
        people,
        existing,
        'a2',
      ).ok,
    ).toBe(true);
  });
  it('allows overlap with a different person', () => {
    expect(validateAbsence(input(), people, existing, 'a2').ok).toBe(true);
  });
});

describe('persistence', () => {
  beforeEach(() => localStorage.clear());
  const fallback: Absence[] = [];

  it('round-trips through localStorage under the versioned key', () => {
    saveAbsences(MONDAY, existing);
    expect(ABSENCES_KEY).toMatch(/\.v1$/);
    expect(loadAbsences(MONDAY, fallback)).toEqual(existing);
  });
  it('falls back on corrupt JSON, wrong shape, wrong version or another week', () => {
    localStorage.setItem(ABSENCES_KEY, '{nope');
    expect(loadAbsences(MONDAY, fallback)).toBe(fallback);
    localStorage.setItem(
      ABSENCES_KEY,
      JSON.stringify({ version: 2, referenceDate: MONDAY, absences: [] }),
    );
    expect(loadAbsences(MONDAY, fallback)).toBe(fallback);
    localStorage.setItem(
      ABSENCES_KEY,
      JSON.stringify({ version: 1, referenceDate: MONDAY, absences: [{ id: 'x' }] }),
    );
    expect(loadAbsences(MONDAY, fallback)).toBe(fallback);
    saveAbsences('2026-11-02', existing);
    expect(loadAbsences(MONDAY, fallback)).toBe(fallback);
  });
  it('falls back when storage throws', () => {
    const storage = {
      getItem: () => {
        throw new Error('denied');
      },
    };
    expect(loadAbsences(MONDAY, fallback, storage)).toBe(fallback);
  });
  it('generates the next free id', () => {
    expect(nextAbsenceId([])).toBe('a1');
    expect(
      nextAbsenceId([
        ...existing,
        { id: 'a9', personId: 'p2', type: 'sick', from: MONDAY, to: MONDAY },
      ]),
    ).toBe('a10');
  });
});

describe('absences feed the staffing rules', () => {
  it('an absent person is not drafted and the slot becomes a gap', () => {
    const lead = person('lead', { homeRole: 'lineLeader', roles: ['lineLeader'] });
    const absent: Absence[] = [
      { id: 'a1', personId: 'lead', type: 'sick', from: MONDAY, to: MONDAY },
    ];
    const drafted = draftShiftAssignments(MONDAY, 'early', [lead], absent);
    expect(drafted.some((a) => a.personId === 'lead')).toBe(false);
    const report = checkShift(MONDAY, 'early', {
      people: [lead],
      absences: absent,
      assignments: drafted,
    });
    expect(report.errors).toBeGreaterThan(0);
  });
});
