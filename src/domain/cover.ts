import { availabilityFor } from './availability';
import { CREWS, SHIFTS } from './constants';
import { qualificationFor, type Qualification } from './qualifications';
import { crewForShift, shiftForCrew } from './rotation';
import type { Absence, Assignment, IsoDate, LineId, Person, Role, ShiftType } from './schemas';

export interface CoverRequest {
  date: IsoDate;
  shift: ShiftType;
  line: LineId;
  role: Role;
}

export interface CoverContext {
  people: readonly Person[];
  absences: readonly Absence[];
  assignments: readonly Assignment[];
  holidays?: readonly IsoDate[];
}

/**
 * Lower tier = better.
 * 0: qualified, from the crew on this shift and not yet assigned (spare)
 * 1: qualified, from another crew
 * 2: stand-in without concerns (e.g. Lead as Secondary, Mechanic as operator)
 * 3: stand-in with a warning (Lead as Primary, last resort)
 */
export type CoverTier = 0 | 1 | 2 | 3;

export interface CoverSuggestion {
  person: Person;
  tier: CoverTier;
  qualification: Exclude<Qualification, { kind: 'not-qualified' }>;
  notes: string[];
}

/**
 * Suggest people who could cover a gap. The app only suggests; the planner decides.
 * Absent and already-assigned people are excluded.
 */
export function suggestCover(req: CoverRequest, ctx: CoverContext): CoverSuggestion[] {
  const onShiftCrew = crewForShift(req.shift, req.date);
  const out: CoverSuggestion[] = [];

  for (const person of ctx.people) {
    if (!availabilityFor(person, req.date, req.shift, ctx).available) continue;
    const q = qualificationFor(person, req.role, req.line);
    if (q.kind === 'not-qualified') continue;

    const notes: string[] = [];
    const sameCrew = person.crewId === onShiftCrew;
    if (!sameCrew) {
      const own = SHIFTS[shiftForCrew(person.crewId, req.date)].label;
      const crewName = CREWS.find((c) => c.id === person.crewId)?.name ?? person.crewId;
      notes.push(`${crewName} works ${own} this week - check rest time and overtime`);
    }
    if (q.kind === 'stand-in') notes.push(q.reason);

    const tier: CoverTier =
      q.kind === 'qualified' ? (sameCrew ? 0 : 1) : q.severity === 'warning' ? 3 : 2;
    out.push({ person, tier, qualification: q, notes });
  }

  return out.sort(
    (a, b) =>
      a.tier - b.tier ||
      Number(b.person.crewId === onShiftCrew) - Number(a.person.crewId === onShiftCrew) ||
      Number(b.person.homeLine === req.line) - Number(a.person.homeLine === req.line) ||
      a.person.name.localeCompare(b.person.name),
  );
}
