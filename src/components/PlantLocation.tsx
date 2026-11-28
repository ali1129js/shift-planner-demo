import {
  DEFAULT_STATE,
  HOLIDAYS_AS_OF,
  HOLIDAYS_SOURCE,
  STATES,
  stateName,
  type StateCode,
} from '../domain';

export function PlantLocation({
  state,
  onChange,
}: {
  state: StateCode;
  onChange: (s: StateCode) => void;
}) {
  return (
    <p className="plant">
      <label>
        Standort des fiktiven Werks (Feiertage):{' '}
        <select
          className="btn"
          value={state}
          onChange={(e) => onChange(e.target.value as StateCode)}
        >
          {STATES.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <span className="hint">
        {' '}
        Standard: {stateName(DEFAULT_STATE)}. Quelle: {HOLIDAYS_SOURCE}, Stand {HOLIDAYS_AS_OF}.
      </span>
    </p>
  );
}
