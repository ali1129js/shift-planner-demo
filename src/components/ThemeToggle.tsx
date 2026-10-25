import type { Theme } from '../theme/theme';

export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      className="btn theme-toggle"
      aria-pressed={dark}
      aria-label={dark ? 'Zu hellem Design wechseln' : 'Zu dunklem Design wechseln'}
      onClick={onToggle}
    >
      {dark ? '☀ Hell' : '☾ Dunkel'}
    </button>
  );
}
