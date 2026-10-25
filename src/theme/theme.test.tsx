// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { ThemeToggle } from '../components/ThemeToggle';
import { THEME_KEY, initialTheme, useTheme } from './theme';

function Harness() {
  const [theme, toggle] = useTheme();
  return <ThemeToggle theme={theme} onToggle={toggle} />;
}

describe('theme', () => {
  beforeEach(() => localStorage.clear());
  it('falls back to system (light in jsdom) and respects stored value', () => {
    expect(initialTheme()).toBe('light');
    localStorage.setItem(THEME_KEY, 'dark');
    expect(initialTheme()).toBe('dark');
  });
  it('toggles data-theme and persists choice', async () => {
    render(<Harness />);
    expect(document.documentElement.dataset.theme).toBe('light');
    await userEvent.click(screen.getByRole('button', { name: /dunklem Design/ }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(screen.getByRole('button', { name: /hellem Design/ })).toHaveTextContent('Hell');
  });
});
