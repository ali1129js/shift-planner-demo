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
  'line-leader-missing': 'lineLeader',
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

const SHORT: Record<string, string> = {
  'primary-missing': 'Kein Primär',
  'line-leader-missing': 'Kein Linienleiter',
  'secondary-missing': 'Kein Sekundär',
  'person-absent': 'Abwesende Person eingeteilt',
  'not-qualified': 'Nicht qualifiziert',
  'double-booked': 'Doppelt eingeteilt',
  'primary-surplus': 'Mehr als 1 Primär',
  'secondary-below-optimal': 'Nur 1 Sekundär',
  'stand-in': 'Vertretung',
};

/** A few words describing the worst problem of a line, e.g. "Kein Primär". */
export function shortReason(issues: readonly StaffingIssue[]): string {
  const pick = (sev: StaffingIssue['severity']) => issues.filter((i) => i.severity === sev);
  const top = pick('error')[0] ?? pick('warning')[0];
  if (!top) return 'OK';
  const extra = pick('error').length + pick('warning').length - 1;
  return `${SHORT[top.code] ?? top.message}${extra > 0 ? ` +${extra}` : ''}`;
}

export type SlotState = 'filled' | 'flagged' | 'missing' | 'optional';

export interface Slot {
  role: Role;
  state: SlotState;
  severity: Status;
  personId?: string;
  note?: string;
}

/** Fixed role rows of a line card: Line Leader, Mechanic, Primary, Secondary (1-2). */
export const CARD_ROLES: readonly Role[] = ['lineLeader', 'mechanic', 'primary', 'secondary'];

export function lineSlots(view: ShiftView, line: LineId): Record<Role, Slot[]> {
  const issues = lineIssues(view, line);
  const out = {} as Record<Role, Slot[]>;
  for (const role of CARD_ROLES) {
    const slots: Slot[] = view.assignments
      .filter((a) => a.line === line && a.role === role)
      .map((a) => {
        const own = issues.filter((i) => i.personId === a.personId && i.severity !== 'info');
        const worst = statusOf(own);
        const first = own[0];
        return worst === 'ok' || !first
          ? { role, state: 'filled', severity: 'ok', personId: a.personId }
          : {
              role,
              state: 'flagged',
              severity: worst,
              personId: a.personId,
              note: SHORT[first.code] ?? first.code,
            };
      });
    if (slots.length === 0) {
      // A missing mechanic on one line is covered by the shift-wide mechanic rule.
      slots.push({ role, state: 'missing', severity: role === 'mechanic' ? 'warning' : 'error' });
    } else if (role === 'secondary' && slots.length === 1) {
      slots.push({ role, state: 'optional', severity: 'warning', note: '2. Sekundär (optimal)' });
    }
    out[role] = slots;
  }
  return out;
}

export function chipText(errors: number, warnings: number) {
  if (errors > 0) return { status: 'error' as const, icon: '✕', text: `${errors} Fehl.` };
  if (warnings > 0) return { status: 'warning' as const, icon: '!', text: `${warnings} Warn.` };
  return { status: 'ok' as const, icon: '✓', text: 'OK' };
}
