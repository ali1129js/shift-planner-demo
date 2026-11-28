import { THEME_LABELS, THEME_NAMES, type Theme } from '../theme/colors';
import type { Motion } from '../theme/colors';

export function ThemeToggle({
  theme,
  onTheme,
  motion,
  reducedMotion,
  onMotion,
}: {
  theme: Theme;
  onTheme: (t: Theme) => void;
  motion: Motion;
  reducedMotion: boolean;
  onMotion: () => void;
}) {
  const animated = motion === 'animated' && !reducedMotion;
  return (
    <>
      <label className="theme-select">
        <span>Design</span>
        <select className="btn" value={theme} onChange={(e) => onTheme(e.target.value as Theme)}>
          {THEME_NAMES.map((n) => (
            <option key={n} value={n}>
              {THEME_LABELS[n]}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="btn motion-toggle"
        aria-pressed={animated}
        disabled={reducedMotion}
        title={reducedMotion ? 'Bewegung ist im System reduziert' : undefined}
        onClick={onMotion}
      >
        {animated ? 'Bewegung: an' : 'Bewegung: aus'}
      </button>
    </>
  );
}
