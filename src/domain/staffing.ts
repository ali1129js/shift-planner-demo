import { absenceOn } from './availability';
import { isWorkingDay } from './calendar';
import { ABSENCE_LABELS, LINE_TARGETS, MECHANICS_PER_SHIFT, ROLE_LABELS } from './constants';
import { qualificationFor } from './qualifications';
import { stlOnDuty } from './stl';
import {
  LINE_IDS,
  type Absence,
  type Assignment,
  type IsoDate,
  type LineId,
  type Person,
  type Role,
  type ShiftType,
} from './schemas';

export type Severity = 'error' | 'warning' | 'info';

export interface StaffingIssue {
  severity: Severity;
  code: string;
  message: string;
  line?: LineId;
  personId?: string;
}

export interface StaffingContext {
  people: readonly Person[];
  absences: readonly Absence[];
  assignments: readonly Assignment[];
  holidays?: readonly IsoDate[];
}

export interface ShiftReport {
  date: IsoDate;
  shift: ShiftType;
  issues: StaffingIssue[];
  errors: number;
  warnings: number;
  ok: boolean;
}

function forSlot(ctx: StaffingContext, date: IsoDate, shift: ShiftType): Assignment[] {
  return ctx.assignments.filter((a) => a.date === date && a.shift === shift);
}

/** Validate the people assigned to one line for one shift. */
export function checkLine(
  date: IsoDate,
  shift: ShiftType,
  line: LineId,
  ctx: StaffingContext,
): StaffingIssue[] {
  const issues: StaffingIssue[] = [];
  const peopleById = new Map(ctx.people.map((p) => [p.id, p]));
  const onLine = forSlot(ctx, date, shift).filter((a) => a.line === line);

  // Only assignments by present, qualified people count toward minimums.
  const counts: Record<Role, number> = {
    primary: 0,
    secondary: 0,
    lineLeader: 0,
    mechanic: 0,
    stl: 0,
  };
  for (const a of onLine) {
    const person = peopleById.get(a.personId);
    const label = ROLE_LABELS[a.role];
    if (!person) {
      issues.push({
        severity: 'error',
        code: 'unknown-person',
        line,
        personId: a.personId,
        message: `Unbekannte Person ${a.personId} als ${label} eingeteilt`,
      });
      continue;
    }
    const absence = absenceOn(person.id, date, ctx.absences);
    if (absence) {
      issues.push({
        severity: 'error',
        code: 'person-absent',
        line,
        personId: person.id,
        message: `${person.name} ist abwesend (${ABSENCE_LABELS[absence.type]}), aber als ${label} eingeteilt`,
      });
      continue;
    }
    const q = qualificationFor(person, a.role, line);
    if (q.kind === 'not-qualified') {
      issues.push({
        severity: 'error',
        code: 'not-qualified',
        line,
        personId: person.id,
        message: `${person.name}: ${q.reason}`,
      });
      continue;
    }
    if (q.kind === 'stand-in') {
      issues.push({
        severity: q.severity,
        code: 'stand-in',
        line,
        personId: person.id,
        message: `${person.name}: ${q.reason}`,
      });
    }
    counts[a.role] += 1;
  }

  const L = `Linie ${line}`;
  if (counts.primary === 0) {
    issues.push({ severity: 'error', code: 'primary-missing', line, message: `${L}: kein Primär` });
  } else if (counts.primary > LINE_TARGETS.primary.exact) {
    issues.push({
      severity: 'warning',
      code: 'primary-surplus',
      line,
      message: `${L}: ${counts.primary} Primär (genau 1 erwartet)`,
    });
  }
  if (counts.secondary < LINE_TARGETS.secondary.min) {
    issues.push({
      severity: 'error',
      code: 'secondary-missing',
      line,
      message: `${L}: kein Sekundär`,
    });
  } else if (counts.secondary < LINE_TARGETS.secondary.optimal) {
    issues.push({
      severity: 'warning',
      code: 'secondary-below-optimal',
      line,
      message: `${L}: 1 Sekundär (2 sind optimal)`,
    });
  }
  if (counts.lineLeader < LINE_TARGETS.lineLeader.min) {
    issues.push({
      severity: 'error',
      code: 'line-leader-missing',
      line,
      message: `${L}: kein Linienleiter`,
    });
  }
  if (counts.mechanic < LINE_TARGETS.mechanic.ideal) {
    issues.push({
      severity: 'info',
      code: 'mechanic-not-on-line',
      line,
      message: `${L}: kein eigener Mechaniker`,
    });
  }
  return issues;
}

/** Validate a full shift: every line plus shift-wide rules (mechanics, double bookings). */
export function checkShift(date: IsoDate, shift: ShiftType, ctx: StaffingContext): ShiftReport {
  const issues: StaffingIssue[] = [];
  const slot = forSlot(ctx, date, shift);

  if (!isWorkingDay(date, ctx.holidays)) {
    if (slot.length > 0) {
      issues.push({
        severity: 'error',
        code: 'non-working-day',
        message: `${date} ist kein Arbeitstag, aber es gibt ${slot.length} Einteilung(en)`,
      });
    }
    return summarize(date, shift, issues);
  }

  for (const line of LINE_IDS) issues.push(...checkLine(date, shift, line, ctx));

  const seen = new Map<string, number>();
  for (const a of slot) seen.set(a.personId, (seen.get(a.personId) ?? 0) + 1);
  for (const [personId, n] of seen) {
    if (n > 1) {
      const name = ctx.people.find((p) => p.id === personId)?.name ?? personId;
      issues.push({
        severity: 'error',
        code: 'double-booked',
        personId,
        message: `${name} ist in dieser Schicht ${n}-mal eingeteilt`,
      });
    }
  }

  const mechanics = slot.filter((a) => {
    if (a.role !== 'mechanic') return false;
    const p = ctx.people.find((x) => x.id === a.personId);
    return !!p && !absenceOn(p.id, date, ctx.absences) && p.roles.includes('mechanic');
  }).length;
  if (mechanics < MECHANICS_PER_SHIFT.min) {
    issues.push({
      severity: 'error',
      code: 'mechanics-below-min',
      message: `Nur ${mechanics} Mechaniker in der Schicht (Minimum ${MECHANICS_PER_SHIFT.min})`,
    });
  } else if (mechanics < MECHANICS_PER_SHIFT.ideal) {
    issues.push({
      severity: 'warning',
      code: 'mechanics-below-ideal',
      message: `${mechanics} Mechaniker in der Schicht (ideal ${MECHANICS_PER_SHIFT.ideal}, einer pro Linie)`,
    });
  }
  // STL check only applies when the data models STLs at all.
  if (ctx.people.some((p) => p.roles.includes('stl'))) {
    const stl = stlOnDuty(date, shift, ctx.people, ctx.absences);
    if (!stl.present) {
      issues.push({ severity: 'warning', code: 'stl-missing', message: 'Kein STL im Dienst' });
    }
  }
  return summarize(date, shift, issues);
}

function summarize(date: IsoDate, shift: ShiftType, issues: StaffingIssue[]): ShiftReport {
  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;
  return { date, shift, issues, errors, warnings, ok: errors === 0 };
}
