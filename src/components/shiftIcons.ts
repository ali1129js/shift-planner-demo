import type { ShiftType } from '../domain';

/** Shape cue for each shift so the shift tint is never the only signal. */
export const SHIFT_ICONS: Readonly<Record<ShiftType, string>> = {
  early: '☀️',
  late: '🌇',
  night: '🌙',
};
