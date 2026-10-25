import type { Assignment, IsoDate, LineId, Person, Role, ShiftType } from './schemas';

export const MONDAY: IsoDate = '2026-10-26';

export function person(id: string, over: Partial<Person> = {}): Person {
  return {
    id,
    name: `Person ${id}`,
    crewId: 'crew-1',
    homeRole: 'primary',
    homeLine: '1',
    roles: ['primary'],
    lines: ['1'],
    ...over,
  };
}

export function assign(
  personId: string,
  role: Role,
  line: LineId,
  shift: ShiftType = 'early',
  date: IsoDate = MONDAY,
): Assignment {
  return { date, shift, line, role, personId };
}

/** A fully staffed line: 1 Primary, 2 Secondary, 1 Line Leader, 1 Mechanic. */
export function fullLine(line: LineId, shift: ShiftType = 'early', date: IsoDate = MONDAY) {
  const p = (role: Role, n: number): Person =>
    person(`${line}-${role}-${n}`, {
      homeLine: line,
      homeRole: role,
      roles: [role],
      lines: [line],
    });
  const people = [
    p('primary', 1),
    p('secondary', 1),
    p('secondary', 2),
    p('lineLeader', 1),
    p('mechanic', 1),
  ];
  const assignments = people.map((x) => assign(x.id, x.homeRole, line, shift, date));
  return { people, assignments };
}

export function fullShift(shift: ShiftType = 'early', date: IsoDate = MONDAY) {
  const parts = (['1', '2', '3', '4'] as const).map((l) => fullLine(l, shift, date));
  return {
    people: parts.flatMap((x) => x.people),
    assignments: parts.flatMap((x) => x.assignments),
  };
}
