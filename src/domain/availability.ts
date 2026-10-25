import { isWorkingDay } from './calendar';
import type { Absence, Assignment, IsoDate, Person, ShiftType } from './schemas';

export function absenceOn(
  personId: string,
  date: IsoDate,
  absences: readonly Absence[],
): Absence | undefined {
  return absences.find((a) => a.personId === personId && a.from <= date && date <= a.to);
}

export type Availability =
  | { available: true }
  | {
      available: false;
      reason: 'non-working-day' | 'absent' | 'already-assigned';
      absence?: Absence;
    };

/** Is a person free to be assigned to `date` + `shift`? */
export function availabilityFor(
  person: Person,
  date: IsoDate,
  shift: ShiftType,
  ctx: {
    absences: readonly Absence[];
    assignments?: readonly Assignment[];
    holidays?: readonly IsoDate[];
  },
): Availability {
  if (!isWorkingDay(date, ctx.holidays)) return { available: false, reason: 'non-working-day' };
  const absence = absenceOn(person.id, date, ctx.absences);
  if (absence) return { available: false, reason: 'absent', absence };
  const busy = (ctx.assignments ?? []).some(
    (a) => a.personId === person.id && a.date === date && a.shift === shift,
  );
  if (busy) return { available: false, reason: 'already-assigned' };
  return { available: true };
}

export function availablePeople(
  people: readonly Person[],
  date: IsoDate,
  shift: ShiftType,
  ctx: {
    absences: readonly Absence[];
    assignments?: readonly Assignment[];
    holidays?: readonly IsoDate[];
  },
): Person[] {
  return people.filter((p) => availabilityFor(p, date, shift, ctx).available);
}
