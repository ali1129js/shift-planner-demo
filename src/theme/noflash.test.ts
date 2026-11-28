/// <reference types="node" />
// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveTheme } from './theme';

const html = readFileSync('index.html', 'utf8');
const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1] ?? '';

function runNoFlash(stored: string | null, dark: boolean, reduced = false, motion?: string) {
  localStorage.clear();
  if (stored !== null) localStorage.setItem('shift-planner.theme', stored);
  if (motion) localStorage.setItem('shift-planner.motion', motion);
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: q.includes('prefers-color-scheme') ? dark : reduced,
  }));
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.motion;
  new Function(script)();
  return {
    theme: document.documentElement.dataset.theme,
    motion: document.documentElement.dataset.motion,
  };
}

describe('index.html no-flash script', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('exists', () => expect(script.length).toBeGreaterThan(50));
  it('picks the same theme as resolveTheme for every stored value', () => {
    for (const stored of [null, 'light', 'dark', 'khaki', 'graphite', 'midnight', 'bogus']) {
      for (const dark of [false, true]) {
        expect(runNoFlash(stored, dark).theme).toBe(resolveTheme(stored, dark));
      }
    }
  });
  it('is static by default and when reduced motion is on', () => {
    expect(runNoFlash(null, false).motion).toBe('static');
    expect(runNoFlash(null, false, false, 'animated').motion).toBe('animated');
    expect(runNoFlash(null, false, true, 'animated').motion).toBe('static');
  });
});
