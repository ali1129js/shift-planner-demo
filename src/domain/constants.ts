import type { AbsenceType, Crew, Line, Role, Shift, ShiftType } from './schemas';

export const COMPANY_NAME = 'Demo Packaging GmbH';

export const LINES: readonly Line[] = [
  { id: '1', name: 'Linie 1' },
  { id: '2', name: 'Linie 2' },
  { id: '3', name: 'Linie 3' },
  { id: '4', name: 'Linie 4' },
];

export const CREWS: readonly Crew[] = [
  { id: 'crew-1', name: 'Gruppe 1' },
  { id: 'crew-2', name: 'Gruppe 2' },
  { id: 'crew-3', name: 'Gruppe 3' },
];

export const SHIFTS: Readonly<Record<ShiftType, Shift>> = {
  early: { type: 'early', label: 'Früh', start: '05:45', end: '14:00', crossesMidnight: false },
  late: { type: 'late', label: 'Spät', start: '13:45', end: '22:00', crossesMidnight: false },
  night: { type: 'night', label: 'Nacht', start: '21:45', end: '06:00', crossesMidnight: true },
};

export const ROLE_LABELS: Readonly<Record<Role, string>> = {
  primary: 'Primär',
  secondary: 'Sekundär',
  lineLeader: 'Linienleiter',
  stl: 'STL',
  mechanic: 'Mechaniker',
};

/** Staffing targets per line and shift. */
export const LINE_TARGETS = {
  primary: { exact: 1 },
  secondary: { min: 1, optimal: 2 },
  lineLeader: { min: 1 },
  mechanic: { ideal: 1 },
} as const;

/** Mechanic targets per shift across all lines. */
export const MECHANICS_PER_SHIFT = { min: 2, ideal: 4 } as const;

export const ABSENCE_LABELS: Readonly<Record<AbsenceType, string>> = {
  vacation: 'Urlaub',
  sick: 'krank',
  training: 'Schulung',
  'overtime-off': 'Überstundenabbau',
  'contract-end': 'Vertragsende',
};
