// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeToggle } from '../components/ThemeToggle';
import {
  MOTION_KEY,
  THEME_KEY,
  effectiveMotion,
  initialTheme,
  parseTheme,
  resolveTheme,
  useMotion,
  useTheme,
} from './theme';

function Harness() {
  const [theme, chooseTheme] = useTheme();
  const [motion, toggleMotion, reduced] = useMotion();
  return (
    <ThemeToggle
      theme={theme}
      onTheme={chooseTheme}
      motion={motion}
      reducedMotion={reduced}
      onMotion={toggleMotion}
    />
  );
}

function mockMedia(matching: string[]) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: matching.includes(q),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.motion;
    mockMedia([]);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('falls back to the system (Khaki light, Graphit dark) and respects a stored value', () => {
    expect(initialTheme()).toBe('khaki');
    mockMedia(['(prefers-color-scheme: dark)']);
    expect(initialTheme()).toBe('graphite');
    localStorage.setItem(THEME_KEY, 'midnight');
    expect(initialTheme()).toBe('midnight');
  });

  it('migrates the old light/dark values and ignores junk', () => {
    expect(parseTheme('light')).toBe('khaki');
    expect(parseTheme('dark')).toBe('graphite');
    expect(parseTheme('neon')).toBeNull();
    expect(resolveTheme('neon', true)).toBe('graphite');
    expect(resolveTheme(null, false)).toBe('khaki');
  });

  it('switches data-theme through the selector and persists the choice', async () => {
    render(<Harness />);
    expect(document.documentElement.dataset.theme).toBe('khaki');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Design' }), 'midnight');
    expect(document.documentElement.dataset.theme).toBe('midnight');
    expect(localStorage.getItem(THEME_KEY)).toBe('midnight');
    expect(screen.getByRole('option', { name: 'Mitternacht' })).toBeInTheDocument();
  });

  it('motion defaults to static and the toggle persists animated', async () => {
    render(<Harness />);
    expect(document.documentElement.dataset.motion).toBe('static');
    const btn = screen.getByRole('button', { name: /Bewegung/ });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(btn);
    expect(document.documentElement.dataset.motion).toBe('animated');
    expect(localStorage.getItem(MOTION_KEY)).toBe('animated');
  });

  it('prefers-reduced-motion forces static and disables the toggle', () => {
    localStorage.setItem(MOTION_KEY, 'animated');
    mockMedia(['(prefers-reduced-motion: reduce)']);
    render(<Harness />);
    expect(document.documentElement.dataset.motion).toBe('static');
    expect(screen.getByRole('button', { name: /Bewegung/ })).toBeDisabled();
    expect(effectiveMotion('animated', true)).toBe('static');
    expect(effectiveMotion('animated', false)).toBe('animated');
  });
});
