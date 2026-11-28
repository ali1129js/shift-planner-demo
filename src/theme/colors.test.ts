/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { THEME_NAMES, colors, contrastPairs, contrastRatio } from './colors';

function cssBlock(theme: string): string {
  const re = new RegExp(`:root(?:,\\s*:root)?\\[data-theme='${theme}'\\]\\s*\\{([^}]*)\\}`);
  const m = re.exec(css);
  if (!m) throw new Error(`no CSS block for ${theme}`);
  return m[1] ?? '';
}

const css = readFileSync('src/App.css', 'utf8');

describe('contrast', () => {
  for (const theme of THEME_NAMES) {
    describe(theme, () => {
      for (const { bg, fg, min } of contrastPairs) {
        const a = colors[theme][bg];
        const b = colors[theme][fg];
        it(`${fg} on ${bg} is at least ${min}:1`, () => {
          expect(contrastRatio(a, b)).toBeGreaterThanOrEqual(min);
        });
      }
    });
  }
});

describe('CSS and tokens stay in sync', () => {
  for (const theme of THEME_NAMES) {
    it(`${theme} block matches colors.ts`, () => {
      const block = cssBlock(theme);
      for (const [name, hex] of Object.entries(colors[theme])) {
        expect(block, `--${name}`).toContain(`--${name}: ${hex};`);
      }
    });
  }
});
