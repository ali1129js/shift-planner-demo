import { useId, useState, type FormEvent } from 'react';
import {
  ABSENCE_LABELS,
  ABSENCE_TYPES,
  CREWS,
  ROLE_LABELS,
  type Absence,
  type IsoDate,
  type Person,
} from '../domain';
import { nextAbsenceId, validateAbsence, type AbsenceInput, type FieldErrors } from '../absences';
import { longDate } from './format';

interface Props {
  people: readonly Person[];
  absences: readonly Absence[];
  /** Absences overlapping this range are listed. */
  rangeFrom: IsoDate;
  rangeTo: IsoDate;
  onAdd: (a: Absence) => void;
  onRemove: (id: string) => void;
}

const OPEN_END = '9999-12-31';

export function AbsenceEditor({ people, absences, rangeFrom, rangeTo, onAdd, onRemove }: Props) {
  const uid = useId();
  const [input, setInput] = useState<AbsenceInput>({
    personId: '',
    type: 'vacation',
    from: rangeFrom,
    to: rangeFrom,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState('');
  const byId = new Map(people.map((p) => [p.id, p]));

  const set = (k: keyof AbsenceInput) => (e: { target: { value: string } }) =>
    setInput((prev) => ({ ...prev, [k]: e.target.value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const res = validateAbsence(input, people, absences, nextAbsenceId(absences));
    if (!res.ok) {
      setErrors(res.errors);
      setStatus('Abwesenheit nicht gespeichert. Bitte Eingaben prüfen.');
      return;
    }
    setErrors({});
    onAdd(res.absence);
    const name = byId.get(res.absence.personId)?.name ?? res.absence.personId;
    setStatus(`Abwesenheit für ${name} hinzugefügt.`);
  };

  const remove = (a: Absence) => {
    onRemove(a.id);
    setStatus(`Abwesenheit für ${byId.get(a.personId)?.name ?? a.personId} entfernt.`);
  };

  const listed = absences
    .filter((a) => a.from <= rangeTo && rangeFrom <= a.to)
    .slice()
    .sort((a, b) => a.from.localeCompare(b.from) || a.personId.localeCompare(b.personId));

  const field = (k: keyof AbsenceInput) => ({
    id: `${uid}-${k}`,
    'aria-invalid': errors[k] ? true : undefined,
    'aria-describedby': errors[k] ? `${uid}-${k}-err` : undefined,
  });
  const err = (k: keyof AbsenceInput) =>
    errors[k] && (
      <span id={`${uid}-${k}-err`} className="field-error">
        {errors[k]}
      </span>
    );

  return (
    <section className="absences" aria-labelledby={`${uid}-title`}>
      <h2 id={`${uid}-title`}>Abwesenheiten</h2>
      <form className="absence-form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor={`${uid}-personId`}>Person</label>
          <select {...field('personId')} value={input.personId} onChange={set('personId')}>
            <option value="">Bitte auswählen…</option>
            {CREWS.map((c) => (
              <optgroup key={c.id} label={c.name}>
                {people
                  .filter((p) => p.crewId === c.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.spare ? 'Springer' : ROLE_LABELS[p.homeRole]})
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          {err('personId')}
        </div>
        <div className="field">
          <label htmlFor={`${uid}-type`}>Art</label>
          <select {...field('type')} value={input.type} onChange={set('type')}>
            {ABSENCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {ABSENCE_LABELS[t]}
              </option>
            ))}
          </select>
          {err('type')}
        </div>
        <div className="field">
          <label htmlFor={`${uid}-from`}>Von</label>
          <input type="date" {...field('from')} value={input.from} onChange={set('from')} />
          {err('from')}
        </div>
        <div className="field">
          <label htmlFor={`${uid}-to`}>Bis (einschließlich)</label>
          <input type="date" {...field('to')} value={input.to} onChange={set('to')} />
          {err('to')}
        </div>
        <button type="submit" className="btn btn-primary">
          Abwesenheit hinzufügen
        </button>
      </form>
      <p className="sr-status" role="status" aria-live="polite">
        {status}
      </p>

      <h3>In dieser Woche</h3>
      {listed.length === 0 ? (
        <p>Keine Abwesenheiten in dieser Woche.</p>
      ) : (
        <ul className="plain absence-list">
          {listed.map((a) => {
            const name = byId.get(a.personId)?.name ?? a.personId;
            return (
              <li key={a.id}>
                <span>
                  <strong>{name}</strong> · {ABSENCE_LABELS[a.type]} · {longDate(a.from)}
                  {a.to === OPEN_END ? ' – offen' : a.to !== a.from ? ` – ${longDate(a.to)}` : ''}
                </span>
                <button
                  type="button"
                  className="btn btn-small"
                  aria-label={`Abwesenheit von ${name} (${ABSENCE_LABELS[a.type]}) entfernen`}
                  onClick={() => remove(a)}
                >
                  Entfernen
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
