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
      <summary>Einstellungen</summary>
      <fieldset>
        <legend>Liniennamen</legend>
        <p className="hint">
          Nur in diesem Browser gespeichert (localStorage). Wird nicht geteilt oder hochgeladen.
        </p>
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
          Liniennamen zurücksetzen
        </button>
      </fieldset>
    </details>
  );
}
