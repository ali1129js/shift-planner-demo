import { describe, expect, it } from 'vitest';
import {
  AbsenceSchema,
  PersonSchema,
  PlanSchema,
  ROTATION_NOTE,
  availabilityFor,
  checkLine,
  checkShift,
  crewForShift,
  draftShiftAssignments,
  generateDemoData,
  isWorkingDay,
  qualificationFor,
  rotationForWeek,
  shiftForCrew,
  suggestCover,
  type Absence,
} from './index';
import { MONDAY, assign, fullLine, fullShift, person } from './testFixtures';

const codes = (issues: { code: string }[]) => issues.map((i) => i.code);

describe('schemas', () => {
  it('accepts a valid person and rejects an empty role list', () => {
    expect(PersonSchema.safeParse(person('x')).success).toBe(true);
    expect(PersonSchema.safeParse({ ...person('x'), roles: [] }).success).toBe(false);
  });
  it('rejects an absence that ends before it starts', () => {
    const r = AbsenceSchema.safeParse({
      id: 'a',
      personId: 'x',
      type: 'sick',
      from: '2026-10-27',
      to: '2026-10-26',
    });
    expect(r.success).toBe(false);
  });
  it('rejects unknown absence types and malformed dates in a plan', () => {
    expect(
      AbsenceSchema.safeParse({ id: 'a', personId: 'x', type: 'holiday', from: MONDAY, to: MONDAY })
        .success,
    ).toBe(false);
    expect(
      PlanSchema.safeParse({ id: 'p', weekStart: '26.10.2026', assignments: [] }).success,
    ).toBe(false);
  });
});

describe('calendar', () => {
  it('works Monday to Friday only', () => {
    expect(isWorkingDay('2026-10-26')).toBe(true); // Mon
    expect(isWorkingDay('2026-10-30')).toBe(true); // Fri
    expect(isWorkingDay('2026-10-31')).toBe(false); // Sat
    expect(isWorkingDay('2026-11-01')).toBe(false); // Sun
  });
  it('treats configured holidays as non-working', () => {
    expect(isWorkingDay('2026-12-25', ['2026-12-25'])).toBe(false);
  });
});

describe('rotation (backward: Early -> Night -> Late)', () => {
  it('assigns each crew a distinct shift every week', () => {
    const r = rotationForWeek(MONDAY);
    expect(new Set(Object.values(r)).size).toBe(3);
  });
  it('moves a crew Early -> Night -> Late -> Early over consecutive weeks', () => {
    const weeks = ['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26'];
    expect(weeks.map((w) => shiftForCrew('crew-1', w))).toEqual([
      'early',
      'night',
      'late',
      'early',
    ]);
  });
  it('gives the same answer for any day within a week', () => {
    expect(rotationForWeek('2026-10-26')).toEqual(rotationForWeek('2026-10-30'));
    expect(crewForShift('night', '2026-10-28')).toBe(crewForShift('night', '2026-10-26'));
  });
  it('works for weeks before the epoch', () => {
    expect(shiftForCrew('crew-1', '2025-12-29')).toBe('late');
  });
  it('provides an informational note recommending forward rotation', () => {
    expect(ROTATION_NOTE).toMatch(/forward rotation/i);
  });
});

describe('qualifications', () => {
  const mech = person('m', { roles: ['mechanic'], homeRole: 'mechanic', lines: ['2'] });
  const lead = person('l', { roles: ['lineLeader'], homeRole: 'lineLeader', lines: ['1'] });
  it('lets a mechanic work as mechanic on any line', () => {
    expect(qualificationFor(mech, 'mechanic', '4').kind).toBe('qualified');
  });
  it('lets a mechanic stand in as operator only on listed lines', () => {
    expect(qualificationFor(mech, 'secondary', '2').kind).toBe('stand-in');
    expect(qualificationFor(mech, 'primary', '1').kind).toBe('not-qualified');
  });
  it('lets a Line Leader stand in as Secondary without a warning', () => {
    expect(qualificationFor(lead, 'secondary', '1')).toMatchObject({
      kind: 'stand-in',
      severity: 'info',
    });
  });
  it('allows a Line Leader as Primary only with a warning', () => {
    expect(qualificationFor(lead, 'primary', '1')).toMatchObject({
      kind: 'stand-in',
      severity: 'warning',
    });
  });
  it('rejects operators on lines they are not qualified for', () => {
    expect(qualificationFor(person('p'), 'primary', '3').kind).toBe('not-qualified');
  });
  it('requires an explicit Line Leader qualification on that line', () => {
    expect(
      qualificationFor(person('p', { roles: ['primary', 'secondary'] }), 'lineLeader', '1').kind,
    ).toBe('not-qualified');
    expect(qualificationFor(lead, 'lineLeader', '2').kind).toBe('not-qualified');
  });
});

describe('availability', () => {
  const p = person('p1');
  const absences: Absence[] = [
    { id: 'a', personId: 'p1', type: 'vacation', from: '2026-10-27', to: '2026-10-28' },
  ];
  it('is available on a normal working day', () => {
    expect(availabilityFor(p, MONDAY, 'early', { absences }).available).toBe(true);
  });
  it('is unavailable during an absence (inclusive range)', () => {
    expect(availabilityFor(p, '2026-10-28', 'night', { absences })).toMatchObject({
      available: false,
      reason: 'absent',
    });
  });
  it('is unavailable on weekends', () => {
    expect(availabilityFor(p, '2026-11-01', 'early', { absences })).toMatchObject({
      available: false,
      reason: 'non-working-day',
    });
  });
  it('is unavailable when already assigned in the same shift', () => {
    const assignments = [assign('p1', 'primary', '1')];
    expect(availabilityFor(p, MONDAY, 'early', { absences, assignments })).toMatchObject({
      reason: 'already-assigned',
    });
  });
  it('treats contract end as open-ended absence', () => {
    const ce: Absence[] = [
      { id: 'c', personId: 'p1', type: 'contract-end', from: MONDAY, to: '9999-12-31' },
    ];
    expect(availabilityFor(p, '2027-03-01', 'early', { absences: ce }).available).toBe(false);
  });
});

describe('staffing check per line', () => {
  it('reports no errors or warnings for a fully staffed line', () => {
    const { people, assignments } = fullLine('1');
    const issues = checkLine(MONDAY, 'early', '1', { people, absences: [], assignments });
    expect(issues.filter((i) => i.severity !== 'info')).toEqual([]);
  });
  it('errors when the Primary is missing and warns when there are two', () => {
    const { people, assignments } = fullLine('1');
    const none = assignments.filter((a) => a.role !== 'primary');
    expect(
      codes(checkLine(MONDAY, 'early', '1', { people, absences: [], assignments: none })),
    ).toContain('primary-missing');
    const extra = person('extra', { roles: ['primary'] });
    const two = [...assignments, assign('extra', 'primary', '1')];
    expect(
      codes(
        checkLine(MONDAY, 'early', '1', {
          people: [...people, extra],
          absences: [],
          assignments: two,
        }),
      ),
    ).toContain('primary-surplus');
  });
  it('warns with one Secondary and errors with none', () => {
    const { people, assignments } = fullLine('1');
    const one = assignments.filter((a) => a.personId !== '1-secondary-2');
    const issues = checkLine(MONDAY, 'early', '1', { people, absences: [], assignments: one });
    expect(issues.find((i) => i.code === 'secondary-below-optimal')?.severity).toBe('warning');
    const zero = assignments.filter((a) => a.role !== 'secondary');
    expect(
      codes(checkLine(MONDAY, 'early', '1', { people, absences: [], assignments: zero })),
    ).toContain('secondary-missing');
  });
  it('errors when the Line Leader is missing', () => {
    const { people, assignments } = fullLine('1');
    const noLead = assignments.filter((a) => a.role !== 'lineLeader');
    expect(
      codes(checkLine(MONDAY, 'early', '1', { people, absences: [], assignments: noLead })),
    ).toContain('line-leader-missing');
  });
  it('does not count an absent person and flags the assignment', () => {
    const { people, assignments } = fullLine('1');
    const absences: Absence[] = [
      { id: 'x', personId: '1-primary-1', type: 'sick', from: MONDAY, to: MONDAY },
    ];
    const c = codes(checkLine(MONDAY, 'early', '1', { people, absences, assignments }));
    expect(c).toContain('person-absent');
    expect(c).toContain('primary-missing');
  });
  it('flags a Line Leader filling in as Primary as a warning but counts them', () => {
    const { people, assignments } = fullLine('1');
    const lead2 = person('lead2', { roles: ['lineLeader'], homeRole: 'lineLeader' });
    const swapped = [
      ...assignments.filter((a) => a.role !== 'primary'),
      assign('lead2', 'primary', '1'),
    ];
    const issues = checkLine(MONDAY, 'early', '1', {
      people: [...people, lead2],
      absences: [],
      assignments: swapped,
    });
    expect(issues.find((i) => i.code === 'stand-in')?.severity).toBe('warning');
    expect(codes(issues)).not.toContain('primary-missing');
  });
  it('rejects an unqualified person and does not count them', () => {
    const { people, assignments } = fullLine('1');
    const outsider = person('o', { lines: ['3'] });
    const swapped = [
      ...assignments.filter((a) => a.role !== 'primary'),
      assign('o', 'primary', '1'),
    ];
    const c = codes(
      checkLine(MONDAY, 'early', '1', {
        people: [...people, outsider],
        absences: [],
        assignments: swapped,
      }),
    );
    expect(c).toEqual(expect.arrayContaining(['not-qualified', 'primary-missing']));
  });
});

describe('staffing check per shift', () => {
  it('is ok for a full shift', () => {
    const report = checkShift(MONDAY, 'early', { ...fullShift(), absences: [] });
    expect(report).toMatchObject({ ok: true, errors: 0, warnings: 0 });
  });
  it('warns below 4 mechanics and errors below 2', () => {
    const { people, assignments } = fullShift();
    const drop = (n: number) => {
      const mechs = assignments
        .filter((a) => a.role === 'mechanic')
        .slice(0, n)
        .map((a) => a.personId);
      return assignments.filter((a) => !mechs.includes(a.personId));
    };
    const r3 = checkShift(MONDAY, 'early', { people, absences: [], assignments: drop(1) });
    expect(r3.issues.find((i) => i.code === 'mechanics-below-ideal')?.severity).toBe('warning');
    const r1 = checkShift(MONDAY, 'early', { people, absences: [], assignments: drop(3) });
    expect(codes(r1.issues)).toContain('mechanics-below-min');
    expect(r1.ok).toBe(false);
  });
  it('accepts one mechanic covering two lines as long as the shift total is met', () => {
    const { people, assignments } = fullShift();
    const moved = assignments.map((a) =>
      a.personId === '2-mechanic-1' ? { ...a, line: '1' as const } : a,
    );
    const r = checkShift(MONDAY, 'early', { people, absences: [], assignments: moved });
    expect(r.ok).toBe(true);
    expect(r.issues.find((i) => i.code === 'mechanic-not-on-line')?.line).toBe('2');
  });
  it('detects a person booked twice in the same shift', () => {
    const { people, assignments } = fullShift();
    const dup = [...assignments, assign('1-lineLeader-1', 'secondary', '2')];
    expect(
      codes(checkShift(MONDAY, 'early', { people, absences: [], assignments: dup }).issues),
    ).toContain('double-booked');
  });
  it('errors when assignments exist on a Sunday or holiday', () => {
    const sunday = '2026-11-01';
    const r = checkShift(sunday, 'early', {
      people: [person('p')],
      absences: [],
      assignments: [assign('p', 'primary', '1', 'early', sunday)],
    });
    expect(codes(r.issues)).toEqual(['non-working-day']);
    const empty = checkShift(sunday, 'early', { people: [], absences: [], assignments: [] });
    expect(empty.ok).toBe(true);
  });
});

describe('cover suggestions', () => {
  const crewOnEarly = crewForShift('early', MONDAY);
  const otherCrew = crewForShift('late', MONDAY);
  const spare = person('spare', { name: 'Spare', crewId: crewOnEarly, roles: ['primary'] });
  const other = person('other', { name: 'Other', crewId: otherCrew, roles: ['primary'] });
  const lead = person('lineLeader', { name: 'Lead', crewId: crewOnEarly, roles: ['lineLeader'] });
  const mech = person('mech', { name: 'Mech', crewId: crewOnEarly, roles: ['mechanic'] });
  const stranger = person('stranger', { name: 'Stranger', lines: ['4'] });
  const people = [lead, mech, other, stranger, spare];
  const req = { date: MONDAY, shift: 'early', line: '1', role: 'primary' } as const;

  it('ranks same-role qualified first, then other crews, then stand-ins, warnings last', () => {
    const s = suggestCover(req, { people, absences: [], assignments: [] });
    expect(s.map((x) => x.person.id)).toEqual(['spare', 'other', 'mech', 'lineLeader']);
    expect(s.map((x) => x.tier)).toEqual([0, 1, 2, 3]);
  });
  it('excludes absent, already assigned and unqualified people', () => {
    const absences: Absence[] = [
      { id: 'a', personId: 'spare', type: 'training', from: MONDAY, to: MONDAY },
    ];
    const assignments = [assign('other', 'primary', '2')];
    const ids = suggestCover(req, { people, absences, assignments }).map((x) => x.person.id);
    expect(ids).not.toContain('spare');
    expect(ids).not.toContain('other');
    expect(ids).not.toContain('stranger');
  });
  it('adds a rest-time note for people from another crew', () => {
    const s = suggestCover(req, { people, absences: [], assignments: [] });
    expect(s.find((x) => x.person.id === 'other')?.notes.join(' ')).toMatch(/rest time/);
    expect(s.find((x) => x.person.id === 'spare')?.notes).toEqual([]);
  });
});

describe('demo data', () => {
  const ref = '2026-10-26';
  it('is deterministic for the same seed and differs for another seed', () => {
    expect(generateDemoData({ referenceDate: ref })).toEqual(
      generateDemoData({ referenceDate: ref }),
    );
    expect(generateDemoData({ referenceDate: ref, seed: 7 })).not.toEqual(
      generateDemoData({ referenceDate: ref }),
    );
  });
  it('creates 66 valid people in 3 crews of 22 (incl. 2 spares) with unique ids and names', () => {
    const { people } = generateDemoData({ referenceDate: ref });
    expect(people).toHaveLength(66);
    people.forEach((p) => PersonSchema.parse(p));
    expect(new Set(people.map((p) => p.id)).size).toBe(66);
    expect(new Set(people.map((p) => p.name)).size).toBe(66);
    for (const crew of ['crew-1', 'crew-2', 'crew-3']) {
      expect(people.filter((p) => p.crewId === crew)).toHaveLength(22);
      expect(people.filter((p) => p.crewId === crew && p.spare)).toHaveLength(2);
    }
  });
  it('creates valid absences including several types', () => {
    const { absences } = generateDemoData({ referenceDate: ref });
    absences.forEach((a) => AbsenceSchema.parse(a));
    expect(new Set(absences.map((a) => a.type)).size).toBeGreaterThanOrEqual(3);
    expect(absences.some((a) => a.type === 'contract-end')).toBe(true);
  });
  it('produces a clean shift when nobody is absent', () => {
    const { people } = generateDemoData({ referenceDate: ref });
    const assignments = draftShiftAssignments(ref, 'early', people, []);
    expect(checkShift(ref, 'early', { people, absences: [], assignments }).ok).toBe(true);
  });
  it('does not draft spares but suggests them first as same-crew cover', () => {
    const { people } = generateDemoData({ referenceDate: ref });
    const assignments = draftShiftAssignments(ref, 'early', people, []);
    const spares = people.filter((p) => p.spare).map((p) => p.id);
    expect(assignments.some((a) => spares.includes(a.personId))).toBe(false);
    const missing = assignments.filter((a) => !(a.line === '1' && a.role === 'secondary'));
    const s = suggestCover(
      { date: ref, shift: 'early', line: '1', role: 'secondary' },
      { people, absences: [], assignments: missing },
    );
    const crew = crewForShift('early', ref);
    expect(s.find((x) => x.tier === 0)?.person.crewId).toBe(crew);
  });
  it('drafts nothing on a weekend', () => {
    const { people, absences } = generateDemoData({ referenceDate: ref });
    expect(draftShiftAssignments('2026-10-31', 'early', people, absences)).toEqual([]);
  });
});
