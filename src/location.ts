import { useCallback, useState } from 'react';
import { DEFAULT_STATE, isStateCode, type StateCode } from './domain';

/** Fictional plant location (Bundesland). Local, per-browser setting. */
export const STATE_KEY = 'shift-planner-demo.state';

export function loadState(
  storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage,
): StateCode {
  try {
    const v = storage?.getItem(STATE_KEY);
    return isStateCode(v) ? v : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

export function usePlantState(): [StateCode, (s: StateCode) => void] {
  const [state, setState] = useState<StateCode>(() => loadState());
  const choose = useCallback((s: StateCode) => {
    setState(s);
    try {
      globalThis.localStorage?.setItem(STATE_KEY, s);
    } catch {
      // Storage may be unavailable (private mode); keep in memory.
    }
  }, []);
  return [state, choose];
}
