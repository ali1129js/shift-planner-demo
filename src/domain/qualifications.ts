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
 * - A Shift Lead may stand in as Secondary; as Primary only as a last resort (warning).
 */
export function qualificationFor(person: Person, role: Role, line: LineId): Qualification {
  const onLine = person.lines.includes(line);
  const has = (r: Role) => person.roles.includes(r);

  if (role === 'mechanic') {
    return has('mechanic')
      ? { kind: 'qualified' }
      : { kind: 'not-qualified', reason: 'Not a qualified mechanic' };
  }
  if (has(role) && onLine) return { kind: 'qualified' };
  if (role === 'lead') {
    return { kind: 'not-qualified', reason: `Not qualified as Shift Lead on Line ${line}` };
  }
  if (!onLine) return { kind: 'not-qualified', reason: `Not qualified on Line ${line}` };

  if (has('lead')) {
    return role === 'secondary'
      ? { kind: 'stand-in', severity: 'info', reason: 'Shift Lead standing in as Secondary' }
      : {
          kind: 'stand-in',
          severity: 'warning',
          reason: 'Shift Lead standing in as Primary (last resort)',
        };
  }
  if (has('mechanic')) {
    return { kind: 'stand-in', severity: 'info', reason: `Mechanic standing in as ${role}` };
  }
  return { kind: 'not-qualified', reason: `Not qualified as ${role}` };
}
