import { useCallback, useEffect, useState } from 'react';
import { MOTION_KEY, THEME_KEY, THEME_NAMES, type Motion, type Theme } from './colors';

export { MOTION_KEY, THEME_KEY };
export type { Motion, Theme };

/**
 * Stored values from the old two-way toggle migrate:
 * light -> khaki, dark -> graphite (the closest dark palette).
 * Keep src/theme/noflash.ts and the script in index.html in sync with this.
 */
export function parseTheme(v: string | null): Theme | null {
  if (v === 'light') return 'khaki';
  if (v === 'dark') return 'graphite';
  return (THEME_NAMES as readonly string[]).includes(v ?? '') ? (v as Theme) : null;
}

export function readStoredTheme(): Theme | null {
  try {
    return parseTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return null;
  }
}

export function systemTheme(): Theme {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'graphite'
    : 'khaki';
}

export function resolveTheme(stored: string | null, systemDark: boolean): Theme {
  return parseTheme(stored) ?? (systemDark ? 'graphite' : 'khaki');
}

export function initialTheme(): Theme {
  return readStoredTheme() ?? systemTheme();
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Default is static; reduced-motion always forces static. */
export function effectiveMotion(stored: Motion, reduced: boolean): Motion {
  return reduced ? 'static' : stored;
}

export function readStoredMotion(): Motion {
  try {
    return localStorage.getItem(MOTION_KEY) === 'animated' ? 'animated' : 'static';
  } catch {
    return 'static';
  }
}

export function applyMotion(motion: Motion): void {
  document.documentElement.dataset.motion = effectiveMotion(motion, prefersReducedMotion());
}

function persist(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore (private mode) */
  }
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => applyTheme(theme), [theme]);
  const choose = useCallback((t: Theme) => {
    persist(THEME_KEY, t);
    setTheme(t);
  }, []);
  return [theme, choose];
}

export function useMotion(): [Motion, () => void, boolean] {
  const [motion, setMotion] = useState<Motion>(readStoredMotion);
  const reduced = prefersReducedMotion();
  useEffect(() => applyMotion(motion), [motion]);
  const toggle = useCallback(() => {
    setMotion((m) => {
      const next: Motion = m === 'animated' ? 'static' : 'animated';
      persist(MOTION_KEY, next);
      return next;
    });
  }, []);
  return [motion, toggle, reduced];
}
