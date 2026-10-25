import {
  LINE_IDS,
  SHIFT_TYPES,
  addDays,
  checkShift,
  crewForShift,
  draftShiftAssignments,
  type Absence,
  type Assignment,
  type CrewId,
  type IsoDate,
  type LineId,
  type Person,
  type Role,
  type ShiftReport,
  type ShiftType,
  type StaffingIssue,
} from './domain';

export type Status = 'ok' | 'warning' | 'error';

export interface ShiftView {
  date: IsoDate;
  shift: ShiftType;
  crew: CrewId;
  assignments: Assignment[];
  report: ShiftReport;
}

export function weekDates(weekStart: IsoDate): IsoDate[] {
  return [0, 1, 2, 3, 4].map((n) => addDays(weekStart, n));
}

export function statusOf(issues: readonly StaffingIssue[]): Status {
  if (issues.some((i) => i.severity === 'error')) return 'error';
  if (issues.some((i) => i.severity === 'warning')) return 'warning';
  return 'ok';
}

/** Draft assignments for a shift plus covers the planner accepted. */
export function buildShiftView(
  date: IsoDate,
  shift: ShiftType,
  people: readonly Person[],
  absences: readonly Absence[],
  accepted: readonly Assignment[],
): ShiftView {
  const assignments = [
    ...draftShiftAssignments(date, shift, people, absences),
    ...accepted.filter((a) => a.date === date && a.shift === shift),
  ];
  return {
    date,
    shift,
    crew: crewForShift(shift, date),
    assignments,
    report: checkShift(date, shift, { people, absences, assignments }),
  };
}

export function buildWeek(
  weekStart: IsoDate,
  people: readonly Person[],
  absences: readonly Absence[],
  accepted: readonly Assignment[],
): ShiftView[] {
  return weekDates(weekStart).flatMap((date) =>
    SHIFT_TYPES.map((shift) => buildShiftView(date, shift, people, absences, accepted)),
  );
}

/** Issues that belong to one line, including shift-level issues about a person on that line. */
export function lineIssues(view: ShiftView, line: LineId): StaffingIssue[] {
  const onLine = new Set(view.assignments.filter((a) => a.line === line).map((a) => a.personId));
  return view.report.issues.filter(
    (i) =>
      i.line === line ||
      (i.line === undefined && i.personId !== undefined && onLine.has(i.personId)),
  );
}

export function shiftLevelIssues(view: ShiftView): StaffingIssue[] {
  return view.report.issues.filter((i) => i.line === undefined);
}

const GAP_ROLE: Record<string, Role> = {
  'primary-missing': 'primary',
  'lead-missing': 'lead',
  'secondary-missing': 'secondary',
  'secondary-below-optimal': 'secondary',
  'mechanic-not-on-line': 'mechanic',
};

/** Roles worth covering on a line, most urgent first. */
export function gapRoles(issues: readonly StaffingIssue[]): Role[] {
  const roles: Role[] = [];
  for (const i of issues) {
    const r = GAP_ROLE[i.code];
    if (r && !roles.includes(r)) roles.push(r);
  }
  return roles;
}

export { LINE_IDS };
