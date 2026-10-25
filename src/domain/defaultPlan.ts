import { absenceOn } from './availability';
import { isWorkingDay } from './calendar';
import { crewForShift } from './rotation';
import type { Absence, Assignment, IsoDate, Person, ShiftType } from './schemas';

/**
 * Draft assignments for one shift: every present member of the scheduled crew works their
 * home role on their home line. Spares are not drafted. Gaps are left open for the planner (see suggestCover).
 */
export function draftShiftAssignments(
  date: IsoDate,
  shift: ShiftType,
  people: readonly Person[],
  absences: readonly Absence[],
  holidays: readonly IsoDate[] = [],
): Assignment[] {
  if (!isWorkingDay(date, holidays)) return [];
  const crew = crewForShift(shift, date);
  return people
    .filter((p) => p.crewId === crew && !p.spare && !absenceOn(p.id, date, absences))
    .map((p) => ({ date, shift, line: p.homeLine, role: p.homeRole, personId: p.id }));
}
