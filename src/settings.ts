import { useCallback, useState } from 'react';
import { z } from 'zod';
import { LINES, type LineId } from './domain';

/** Local, per-browser settings. Never sent anywhere and not part of the repository. */
export const LINE_NAMES_KEY = 'shift-planner-demo.lineNames';

export type LineNames = Record<LineId, string>;

const StoredSchema = z.record(z.string(), z.string().max(40));

export function defaultLineNames(): LineNames {
  return Object.fromEntries(LINES.map((l) => [l.id, l.name])) as LineNames;
}

export function loadLineNames(
  storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage,
): LineNames {
  const names = defaultLineNames();
  try {
    const raw = storage?.getItem(LINE_NAMES_KEY);
    if (!raw) return names;
    const parsed = StoredSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return names;
    for (const l of LINES) {
      const v = parsed.data[l.id]?.trim();
      if (v) names[l.id] = v;
    }
  } catch {
    // Ignore unreadable storage and fall back to defaults.
  }
  return names;
}

export function useLineNames() {
  const [names, setNames] = useState<LineNames>(() => loadLineNames());
  const update = useCallback((next: LineNames) => {
    setNames(next);
    try {
      globalThis.localStorage?.setItem(LINE_NAMES_KEY, JSON.stringify(next));
    } catch {
      // Storage may be unavailable (private mode); keep in memory.
    }
  }, []);
  const reset = useCallback(() => {
    setNames(defaultLineNames());
    try {
      globalThis.localStorage?.removeItem(LINE_NAMES_KEY);
    } catch {
      // ignore
    }
  }, []);
  return { names, update, reset };
}
