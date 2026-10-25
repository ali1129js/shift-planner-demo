import { LINES } from '../domain';
import type { LineNames } from '../settings';

interface Props {
  names: LineNames;
  onChange: (names: LineNames) => void;
  onReset: () => void;
}

export function SettingsPanel({ names, onChange, onReset }: Props) {
  return (
    <details className="settings">
      <summary>Settings</summary>
      <fieldset>
        <legend>Line names</legend>
        <p className="hint">Saved in this browser only (localStorage). Not shared or uploaded.</p>
        {LINES.map((l) => (
          <label key={l.id} className="field">
            {l.name}{' '}
            <input
              type="text"
              maxLength={40}
              value={names[l.id]}
              onChange={(e) => onChange({ ...names, [l.id]: e.target.value })}
            />
          </label>
        ))}
        <button type="button" className="btn" onClick={onReset}>
          Reset line names
        </button>
      </fieldset>
    </details>
  );
}
