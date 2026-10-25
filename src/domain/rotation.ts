import { CREW_IDS, type CrewId, type IsoDate, type ShiftType } from './schemas';
import { daysBetween, mondayOf } from './dates';

/**
 * Order each crew moves through, week by week. Ali's plant uses a backward rotation
 * (Early -> Night -> Late). Not enforced as "good" or "bad", only described.
 */
export const ROTATION_ORDER: readonly ShiftType[] = ['early', 'night', 'late'];

/** Reference Monday on which Crew 1 works Early, Crew 2 Night, Crew 3 Late. */
export const ROTATION_EPOCH: IsoDate = '2026-01-05';

export const ROTATION_NOTE =
  'This plan uses a backward rotation (Early -> Night -> Late). Occupational-health guidance ' +
  'generally recommends forward rotation (Early -> Late -> Night), which gives more rest ' +
  'between blocks. Shown for information only; not enforced.';

export function weekNumberSinceEpoch(date: IsoDate, epoch: IsoDate = ROTATION_EPOCH): number {
  return Math.floor(daysBetween(mondayOf(epoch), mondayOf(date)) / 7);
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** Shift a crew works in the week containing `date`. */
export function shiftForCrew(
  crewId: CrewId,
  date: IsoDate,
  epoch: IsoDate = ROTATION_EPOCH,
): ShiftType {
  const crewIndex = CREW_IDS.indexOf(crewId);
  const week = weekNumberSinceEpoch(date, epoch);
  const shift = ROTATION_ORDER[mod(crewIndex + week, ROTATION_ORDER.length)];
  if (!shift) throw new Error('Rotation order is empty');
  return shift;
}

/** Which crew works which shift in the week containing `date`. */
export function rotationForWeek(
  date: IsoDate,
  epoch: IsoDate = ROTATION_EPOCH,
): Record<ShiftType, CrewId> {
  const result: Partial<Record<ShiftType, CrewId>> = {};
  for (const crew of CREW_IDS) result[shiftForCrew(crew, date, epoch)] = crew;
  return result as Record<ShiftType, CrewId>;
}

export function crewForShift(
  shift: ShiftType,
  date: IsoDate,
  epoch: IsoDate = ROTATION_EPOCH,
): CrewId {
  return rotationForWeek(date, epoch)[shift];
}
