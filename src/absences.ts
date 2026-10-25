import { useCallback, useState } from 'react';
import { z } from 'zod';
import {
  AbsenceSchema,
  ABSENCE_TYPES,
  IsoDateSchema,
  type Absence,
  type IsoDate,
  type Person,
} from './domain';

/** Versioned localStorage key for the demo absences. Bump the version on format changes. */
export const ABSENCES_KEY = 'shift-planner-demo.absences.v1';

const StoredSchema = z.object({
  version: z.literal(1),
  /** Monday the demo data was generated for; stored data for another week is discarded. */
  referenceDate: IsoDateSchema,
  absences: z.array(AbsenceSchema),
});

export interface AbsenceInput {
  personId: string;
  type: string;
  from: string;
  to: string;
}

const overlaps = (a: { from: IsoDate; to: IsoDate }, b: { from: IsoDate; to: IsoDate }) =>
  a.from <= b.to && b.from <= a.to;

/** zod schema for a new absence, validated against the current people and absences. */
export function absenceInputSchema(people: readonly Person[], existing: readonly Absence[]) {
  const ids = new Set(people.map((p) => p.id));
  return z
    .object({
      personId: z
        .string()
        .min(1, 'Bitte eine Person auswählen.')
        .refine((id) => ids.has(id), 'Diese Person gibt es nicht.'),
      type: z.enum(ABSENCE_TYPES, { error: 'Bitte eine gültige Art auswählen.' }),
      from: IsoDateSchema.refine((d) => !Number.isNaN(Date.parse(d)), 'Ungültiges Datum.'),
      to: IsoDateSchema.refine((d) => !Number.isNaN(Date.parse(d)), 'Ungültiges Datum.'),
    })
    .superRefine((v, ctx) => {
      if (v.to < v.from) {
        ctx.addIssue({
          code: 'custom',
          path: ['to'],
          message: '„Bis“ darf nicht vor „Von“ liegen.',
        });
        return;
      }
      const clash = existing.find((a) => a.personId === v.personId && overlaps(a, v));
      if (clash) {
        ctx.addIssue({
          code: 'custom',
          path: ['from'],
          message: `Überschneidet sich mit einer bestehenden Abwesenheit (${clash.from} bis ${clash.to}).`,
        });
      }
    });
}

export type FieldErrors = Partial<Record<keyof AbsenceInput, string>>;

export function validateAbsence(
  input: AbsenceInput,
  people: readonly Person[],
  existing: readonly Absence[],
  newId: string,
): { ok: true; absence: Absence } | { ok: false; errors: FieldErrors } {
  const res = absenceInputSchema(people, existing).safeParse(input);
  if (!res.success) {
    const errors: FieldErrors = {};
    for (const issue of res.error.issues) {
      const key = issue.path[0] as keyof AbsenceInput | undefined;
      if (key && !errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors };
  }
  return { ok: true, absence: { id: newId, ...res.data } };
}

type Storage_ = Pick<Storage, 'getItem'> | undefined;

/** Stored absences for `referenceDate`, or `fallback` if missing, corrupt or for another week. */
export function loadAbsences(
  referenceDate: IsoDate,
  fallback: Absence[],
  storage: Storage_ = globalThis.localStorage,
): Absence[] {
  try {
    const raw = storage?.getItem(ABSENCES_KEY);
    if (!raw) return fallback;
    const parsed = StoredSchema.safeParse(JSON.parse(raw));
    if (!parsed.success || parsed.data.referenceDate !== referenceDate) return fallback;
    return parsed.data.absences;
  } catch {
    return fallback;
  }
}

export function saveAbsences(referenceDate: IsoDate, absences: readonly Absence[]) {
  try {
    globalThis.localStorage?.setItem(
      ABSENCES_KEY,
      JSON.stringify({ version: 1, referenceDate, absences }),
    );
  } catch {
    // Storage may be unavailable (private mode); keep in memory.
  }
}

export function clearAbsences() {
  try {
    globalThis.localStorage?.removeItem(ABSENCES_KEY);
  } catch {
    // ignore
  }
}

export function nextAbsenceId(absences: readonly Absence[]): string {
  const max = absences.reduce((m, a) => {
    const n = /^a(\d+)$/.exec(a.id)?.[1];
    return n ? Math.max(m, Number(n)) : m;
  }, 0);
  return `a${max + 1}`;
}

/** Absences state that is persisted to localStorage on every change. */
export function useAbsences(referenceDate: IsoDate, generated: () => Absence[]) {
  const [absences, setState] = useState<Absence[]>(() => loadAbsences(referenceDate, generated()));
  const set = useCallback(
    (next: Absence[]) => {
      setState(next);
      saveAbsences(referenceDate, next);
    },
    [referenceDate],
  );
  const reset = useCallback(() => {
    clearAbsences();
    setState(generated());
  }, [generated]);
  return { absences, set, reset };
}
