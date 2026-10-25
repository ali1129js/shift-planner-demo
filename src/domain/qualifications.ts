import { ROLE_LABELS } from './constants';
import type { LineId, Person, Role } from './schemas';

export type Qualification =
  | { kind: 'qualified' }
  | { kind: 'stand-in'; severity: 'info' | 'warning'; reason: string }
  | { kind: 'not-qualified'; reason: string };

/**
 * Can `person` fill `role` on `line`?
 * - Direct qualification: has the role, and (except mechanics) is qualified on the line.
 * - Mechanics may work as mechanic on any line.
 * - A mechanic may stand in as Primary/Secondary only on their listed lines.
 * - A Line Leader may stand in as Secondary; as Primary only as a last resort (warning).
 */
export function qualificationFor(person: Person, role: Role, line: LineId): Qualification {
  const onLine = person.lines.includes(line);
  const has = (r: Role) => person.roles.includes(r);

  if (role === 'stl') {
    return has('stl') ? { kind: 'qualified' } : { kind: 'not-qualified', reason: 'Kein STL' };
  }
  if (role === 'mechanic') {
    return has('mechanic')
      ? { kind: 'qualified' }
      : { kind: 'not-qualified', reason: 'Kein qualifizierter Mechaniker' };
  }
  if (has(role) && onLine) return { kind: 'qualified' };
  if (role === 'lineLeader') {
    return {
      kind: 'not-qualified',
      reason: `Nicht als Linienleiter für Linie ${line} qualifiziert`,
    };
  }
  if (!onLine) return { kind: 'not-qualified', reason: `Nicht für Linie ${line} qualifiziert` };

  if (has('lineLeader')) {
    return role === 'secondary'
      ? { kind: 'stand-in', severity: 'info', reason: 'Linienleiter springt als Sekundär ein' }
      : {
          kind: 'stand-in',
          severity: 'warning',
          reason: 'Linienleiter springt als Primär ein (letzter Ausweg)',
        };
  }
  if (has('mechanic')) {
    return {
      kind: 'stand-in',
      severity: 'info',
      reason: `Mechaniker springt als ${ROLE_LABELS[role]} ein`,
    };
  }
  return { kind: 'not-qualified', reason: `Nicht als ${ROLE_LABELS[role]} qualifiziert` };
}
