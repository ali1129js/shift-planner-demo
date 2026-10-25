import type { Crew, Line, Role, Shift, ShiftType } from './schemas';

export const COMPANY_NAME = 'Demo Packaging GmbH';

export const LINES: readonly Line[] = [
  { id: '1', name: 'Line 1' },
  { id: '2', name: 'Line 2' },
  { id: '3', name: 'Line 3' },
  { id: '4', name: 'Line 4' },
];

export const CREWS: readonly Crew[] = [
  { id: 'crew-1', name: 'Crew 1' },
  { id: 'crew-2', name: 'Crew 2' },
  { id: 'crew-3', name: 'Crew 3' },
];

export const SHIFTS: Readonly<Record<ShiftType, Shift>> = {
  early: { type: 'early', label: 'Early', start: '05:45', end: '14:00', crossesMidnight: false },
  late: { type: 'late', label: 'Late', start: '13:45', end: '22:00', crossesMidnight: false },
  night: { type: 'night', label: 'Night', start: '21:45', end: '06:00', crossesMidnight: true },
};

export const ROLE_LABELS: Readonly<Record<Role, string>> = {
  primary: 'Primary',
  secondary: 'Secondary',
  lead: 'Shift Lead',
  mechanic: 'Mechanic',
};

/** Staffing targets per line and shift. */
export const LINE_TARGETS = {
  primary: { exact: 1 },
  secondary: { min: 1, optimal: 2 },
  lead: { min: 1 },
  mechanic: { ideal: 1 },
} as const;

/** Mechanic targets per shift across all lines. */
export const MECHANICS_PER_SHIFT = { min: 2, ideal: 4 } as const;
