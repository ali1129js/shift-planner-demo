import { z } from 'zod';

/** ISO calendar date, e.g. 2026-10-26. */
export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
export type IsoDate = z.infer<typeof IsoDateSchema>;

export const LINE_IDS = ['1', '2', '3', '4'] as const;
export const LineIdSchema = z.enum(LINE_IDS);
export type LineId = z.infer<typeof LineIdSchema>;

export const LineSchema = z.object({
  id: LineIdSchema,
  name: z.string().min(1),
});
export type Line = z.infer<typeof LineSchema>;

export const SHIFT_TYPES = ['early', 'late', 'night'] as const;
export const ShiftTypeSchema = z.enum(SHIFT_TYPES);
export type ShiftType = z.infer<typeof ShiftTypeSchema>;

const TimeSchema = z.string().regex(/^\d{2}:\d{2}$/);
export const ShiftSchema = z.object({
  type: ShiftTypeSchema,
  label: z.string().min(1),
  start: TimeSchema,
  end: TimeSchema,
  /** True when the shift ends on the following calendar day. */
  crossesMidnight: z.boolean(),
});
export type Shift = z.infer<typeof ShiftSchema>;

export const ROLES = ['primary', 'secondary', 'lead', 'mechanic'] as const;
export const RoleSchema = z.enum(ROLES);
export type Role = z.infer<typeof RoleSchema>;

export const CREW_IDS = ['crew-1', 'crew-2', 'crew-3'] as const;
export const CrewIdSchema = z.enum(CREW_IDS);
export type CrewId = z.infer<typeof CrewIdSchema>;

export const CrewSchema = z.object({
  id: CrewIdSchema,
  name: z.string().min(1),
});
export type Crew = z.infer<typeof CrewSchema>;

export const PersonSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  crewId: CrewIdSchema,
  /** Role the person normally works. */
  homeRole: RoleSchema,
  /** Line the person normally works on (mechanics: their usual line). */
  homeLine: LineIdSchema,
  /** Roles the person is qualified for. */
  roles: z.array(RoleSchema).min(1),
  /**
   * Lines the person is qualified on. Mechanics may work as mechanic on any line;
   * this list limits where they may stand in as an operator.
   */
  lines: z.array(LineIdSchema).min(1),
  /** Spare (floater) in the crew: not drafted automatically, available for cover. */
  spare: z.boolean().optional(),
});
export type Person = z.infer<typeof PersonSchema>;

export const ABSENCE_TYPES = [
  'vacation',
  'sick',
  'training',
  'overtime-off',
  'contract-end',
] as const;
export const AbsenceTypeSchema = z.enum(ABSENCE_TYPES);
export type AbsenceType = z.infer<typeof AbsenceTypeSchema>;

export const AbsenceSchema = z
  .object({
    id: z.string().min(1),
    personId: z.string().min(1),
    type: AbsenceTypeSchema,
    /** Inclusive start date. */
    from: IsoDateSchema,
    /** Inclusive end date. For contract end, use a far-future date. */
    to: IsoDateSchema,
  })
  .refine((a) => a.from <= a.to, { message: '`from` must not be after `to`', path: ['to'] });
export type Absence = z.infer<typeof AbsenceSchema>;

export const AssignmentSchema = z.object({
  /** Date the shift starts on (night shifts end the next morning). */
  date: IsoDateSchema,
  shift: ShiftTypeSchema,
  line: LineIdSchema,
  role: RoleSchema,
  personId: z.string().min(1),
});
export type Assignment = z.infer<typeof AssignmentSchema>;

export const PlanSchema = z.object({
  id: z.string().min(1),
  /** Monday of the planned week. */
  weekStart: IsoDateSchema,
  assignments: z.array(AssignmentSchema),
});
export type Plan = z.infer<typeof PlanSchema>;
