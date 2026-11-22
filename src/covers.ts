import { useCallback, useState } from 'react';
import { z } from 'zod';
import {
  AssignmentSchema,
  IsoDateSchema,
  type Assignment,
  type IsoDate,
  type Person,
} from './domain';

/**
 * Versioned localStorage key for covers the planner accepted ("Übernehmen").
 * Only the assignment rows are stored (date, shift, line, role, person id), no names or other data.
 * Bump the version on format changes.
 */
export const COVERS_KEY = 'shift-planner-demo.covers.v1';

const StoredSchema = z.object({
  version: z.literal(1),
  /** Monday the demo data was generated for. Same rule as the absences: another week is discarded. */
  referenceDate: IsoDateSchema,
  /** Rows are checked one by one below, so one bad row does not throw away the rest. */
  covers: z.array(z.unknown()),
});

export const sameAssignment = (a: Assignment, b: Assignment) =>
  a.date === b.date &&
  a.shift === b.shift &&
  a.line === b.line &&
  a.role === b.role &&
  a.personId === b.personId;

type Storage_ = Pick<Storage, 'getItem'> | undefined;

/**
 * Stored covers for `referenceDate`. Missing, corrupt or other-week data gives an empty list.
 * Rows that fail the schema or name a person who is not in `people` are dropped; duplicates are removed.
 */
export function loadCovers(
  referenceDate: IsoDate,
  people: readonly Person[],
  storage: Storage_ = globalThis.localStorage,
): Assignment[] {
  try {
    const raw = storage?.getItem(COVERS_KEY);
    if (!raw) return [];
    const parsed = StoredSchema.safeParse(JSON.parse(raw));
    if (!parsed.success || parsed.data.referenceDate !== referenceDate) return [];
    const ids = new Set(people.map((p) => p.id));
    const out: Assignment[] = [];
    for (const row of parsed.data.covers) {
      const r = AssignmentSchema.safeParse(row);
      if (!r.success || !ids.has(r.data.personId)) continue;
      if (!out.some((x) => sameAssignment(x, r.data))) out.push(r.data);
    }
    return out;
  } catch {
    return [];
  }
}

export function saveCovers(referenceDate: IsoDate, covers: readonly Assignment[]) {
  try {
    globalThis.localStorage?.setItem(
      COVERS_KEY,
      JSON.stringify({ version: 1, referenceDate, covers }),
    );
  } catch {
    // Storage may be unavailable (private mode); keep in memory.
  }
}

export function clearCovers() {
  try {
    globalThis.localStorage?.removeItem(COVERS_KEY);
  } catch {
    // ignore
  }
}

/** Accepted covers, persisted to localStorage on every change. */
export function useCovers(referenceDate: IsoDate, people: readonly Person[]) {
  const [covers, setState] = useState<Assignment[]>(() => loadCovers(referenceDate, people));
  const update = useCallback(
    (fn: (prev: Assignment[]) => Assignment[]) => {
      setState((prev) => {
        const next = fn(prev);
        if (next !== prev) saveCovers(referenceDate, next);
        return next;
      });
    },
    [referenceDate],
  );
  const accept = useCallback(
    (a: Assignment) =>
      update((prev) => (prev.some((x) => sameAssignment(x, a)) ? prev : [...prev, a])),
    [update],
  );
  const remove = useCallback(
    (a: Assignment) => update((prev) => prev.filter((x) => !sameAssignment(x, a))),
    [update],
  );
  const reset = useCallback(() => {
    clearCovers();
    setState([]);
  }, []);
  return { covers, accept, remove, reset };
}
