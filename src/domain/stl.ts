import { absenceOn } from './availability';
import { crewForShift } from './rotation';
import type { Absence, IsoDate, Person, ShiftType } from './schemas';

export interface StlOnDuty {
  /** The STL (Shift Team Leader) of the crew on this shift, if the crew has one. */
  stl: Person | undefined;
  present: boolean;
}

/** The crew on duty's STL and whether they are present. STLs are not part of line staffing. */
export function stlOnDuty(
  date: IsoDate,
  shift: ShiftType,
  people: readonly Person[],
  absences: readonly Absence[],
): StlOnDuty {
  const crew = crewForShift(shift, date);
  const stl = people.find((p) => p.crewId === crew && p.roles.includes('stl'));
  return { stl, present: !!stl && !absenceOn(stl.id, date, absences) };
}
