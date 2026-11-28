/**
 * Named theme tokens. src/App.css must carry the same hex values
 * (src/theme/colors.test.ts parses the CSS and fails on drift).
 * Contrast pairs below must meet WCAG AA (4.5:1 text, 3:1 control borders).
 */
export const THEME_NAMES = ['khaki', 'graphite', 'midnight'] as const;
export type Theme = (typeof THEME_NAMES)[number];

export const THEME_LABELS: Readonly<Record<Theme, string>> = {
  khaki: 'Khaki',
  graphite: 'Graphit',
  midnight: 'Mitternacht',
};

export const THEME_KEY = 'shift-planner.theme';
export const MOTION_KEY = 'shift-planner.motion';
export const MOTION_NAMES = ['static', 'animated'] as const;
export type Motion = (typeof MOTION_NAMES)[number];

/** CSS custom property name (without --) to hex, per theme. */
export const colors = {
  khaki: {
    bg: '#d8cdae',
    surface: '#ebe4d0',
    'slot-bg': '#e0d7ba',
    text: '#2a2418',
    muted: '#554c3e',
    line: '#b8ac8e',
    'line-soft': '#d9d0b6',
    'border-strong': '#6f6550',
    accent: '#214bb3',
    'tag-bg': '#d3d9ee',
    'on-inverse': '#ffffff',
    ok: '#00624a',
    'ok-bg': '#d2e6d6',
    warn: '#7a4a00',
    'warn-bg': '#f1e0b2',
    err: '#9f2235',
    'err-bg': '#f0d3ca',
    'early-tint': '#dbe9d1',
    'early-edge': '#8fae88',
    'late-tint': '#f1e7b6',
    'late-edge': '#bfa84e',
    'night-tint': '#eed5cb',
    'night-edge': '#b98a7e',
  },
  graphite: {
    bg: '#1e2329',
    surface: '#2a313a',
    'slot-bg': '#343d48',
    text: '#e8ecf1',
    muted: '#a7b0bc',
    line: '#3a4350',
    'line-soft': '#323a45',
    'border-strong': '#707a8a',
    accent: '#8daeff',
    'tag-bg': '#26365a',
    'on-inverse': '#1e2329',
    ok: '#6fdc95',
    'ok-bg': '#173326',
    warn: '#ffc15e',
    'warn-bg': '#3a2c10',
    err: '#ff9a9a',
    'err-bg': '#3d1b1f',
    'early-tint': '#1f3a2b',
    'early-edge': '#3f7a58',
    'late-tint': '#3a3317',
    'late-edge': '#8a7530',
    'night-tint': '#3b2326',
    'night-edge': '#8a4a50',
  },
  midnight: {
    bg: '#1b1428',
    surface: '#2a2238',
    'slot-bg': '#352c46',
    text: '#ede7f6',
    muted: '#c9c2d6',
    line: '#4a4060',
    'line-soft': '#3a3050',
    'border-strong': '#7a7288',
    accent: '#a9c0ff',
    'tag-bg': '#2f3560',
    'on-inverse': '#1b1428',
    ok: '#7be0a0',
    'ok-bg': '#183327',
    warn: '#ffc66b',
    'warn-bg': '#3b2d14',
    err: '#ffa3a3',
    'err-bg': '#3f1c26',
    'early-tint': '#223b33',
    'early-edge': '#43806a',
    'late-tint': '#3b3419',
    'late-edge': '#8d7832',
    'night-tint': '#3d2430',
    'night-edge': '#8c4d5e',
  },
} as const satisfies Record<Theme, Record<string, string>>;

export type TokenName = keyof (typeof colors)['khaki'];

export interface Pair {
  bg: TokenName;
  fg: TokenName;
  min: number;
}

/** Every text/background combination the app renders, plus control borders. */
export const contrastPairs: readonly Pair[] = [
  { bg: 'bg', fg: 'text', min: 4.5 },
  { bg: 'bg', fg: 'muted', min: 4.5 },
  { bg: 'surface', fg: 'text', min: 4.5 },
  { bg: 'surface', fg: 'muted', min: 4.5 },
  { bg: 'surface', fg: 'accent', min: 4.5 },
  { bg: 'slot-bg', fg: 'text', min: 4.5 },
  { bg: 'slot-bg', fg: 'muted', min: 4.5 },
  { bg: 'tag-bg', fg: 'accent', min: 4.5 },
  { bg: 'accent', fg: 'on-inverse', min: 4.5 },
  { bg: 'ok-bg', fg: 'ok', min: 4.5 },
  { bg: 'warn-bg', fg: 'warn', min: 4.5 },
  { bg: 'err-bg', fg: 'err', min: 4.5 },
  // Shift tints are decorative backgrounds, text on them still has to pass.
  { bg: 'early-tint', fg: 'text', min: 4.5 },
  { bg: 'early-tint', fg: 'muted', min: 4.5 },
  { bg: 'late-tint', fg: 'text', min: 4.5 },
  { bg: 'late-tint', fg: 'muted', min: 4.5 },
  { bg: 'night-tint', fg: 'text', min: 4.5 },
  { bg: 'night-tint', fg: 'muted', min: 4.5 },
  // Control borders (buttons, inputs) against the surface and the page.
  { bg: 'surface', fg: 'border-strong', min: 3 },
  { bg: 'bg', fg: 'border-strong', min: 3 },
];

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16);
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}

export function contrastRatio(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
