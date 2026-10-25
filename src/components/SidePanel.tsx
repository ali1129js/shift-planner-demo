import { useEffect, useRef, useState } from 'react';
import {
  CREWS,
  LINE_ROLES,
  ROLE_LABELS,
  SHIFTS,
  suggestCover,
  type Absence,
  type Assignment,
  type LineId,
  type Person,
  type Role,
} from '../domain';
import { gapRoles, lineIssues, shiftLevelIssues, statusOf, type ShiftView } from '../planner';
import { StatusBadge } from './StatusBadge';
import { dayLabel } from './format';

interface Props {
  view: ShiftView;
  line: LineId;
  lineName: string;
  initialRole?: Role | undefined;
  people: readonly Person[];
  absences: readonly Absence[];
  accepted: readonly Assignment[];
  onAccept: (a: Assignment) => void;
  onRemove: (a: Assignment) => void;
  onClose: () => void;
}

const TIER_LABEL = [
  'Gleiche Rolle, gleiche Gruppe',
  'Gleiche Rolle, andere Gruppe',
  'Vertretung',
  'Vertretung (letzter Ausweg)',
];

export function SidePanel({
  view,
  line,
  lineName,
  initialRole,
  people,
  absences,
  accepted,
  onAccept,
  onRemove,
  onClose,
}: Props) {
  const issues = lineIssues(view, line);
  const gaps = gapRoles(issues);
  const [role, setRole] = useState<Role>(initialRole ?? gaps[0] ?? 'secondary');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const key = `${view.date}|${view.shift}|${line}`;

  useEffect(() => {
    headingRef.current?.focus();
  }, [key]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Domain messages start with the line number; the panel already names the line.
  const clean = (m: string) => m.replace(/^Linie \d+: /, '');

  const byId = new Map(people.map((p) => [p.id, p]));
  const onLine = view.assignments.filter((a) => a.line === line);
  const isAccepted = (a: Assignment) =>
    accepted.some(
      (x) =>
        x.date === a.date &&
        x.shift === a.shift &&
        x.line === a.line &&
        x.role === a.role &&
        x.personId === a.personId,
    );
  const suggestions = suggestCover(
    { date: view.date, shift: view.shift, line, role },
    { people, absences, assignments: view.assignments },
  );
  const crewName = (id: string) => CREWS.find((c) => c.id === id)?.name ?? id;
  const shiftWide = shiftLevelIssues(view).filter((i) => i.personId === undefined);

  return (
    <aside className="panel" aria-labelledby="panel-title">
      <div className="panel-head">
        <h2 id="panel-title" tabIndex={-1} ref={headingRef}>
          {lineName} · {SHIFTS[view.shift].label} · {dayLabel(view.date)}
        </h2>
        <button type="button" className="btn" onClick={onClose} aria-label="Details schließen">
          Schließen
        </button>
      </div>
      <p>
        {crewName(view.crew)} im Dienst. <StatusBadge status={statusOf(issues)} />
      </p>

      <h3>Eingeteilt</h3>
      <ul className="plain">
        {onLine.length === 0 && <li>Niemand eingeteilt.</li>}
        {onLine.map((a) => (
          <li key={`${a.personId}-${a.role}`}>
            <strong>{ROLE_LABELS[a.role]}:</strong> {byId.get(a.personId)?.name ?? a.personId}
            {isAccepted(a) && (
              <>
                {' '}
                <span className="tag">vom Planer hinzugefügt</span>{' '}
                <button type="button" className="btn btn-small" onClick={() => onRemove(a)}>
                  Entfernen
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      <h3>Regelprüfung</h3>
      <ul className="plain">
        {issues.length === 0 && <li>Alle Regeln für diese Linie erfüllt.</li>}
        {issues.map((i, n) => (
          <li key={n}>
            <StatusBadge status={i.severity} /> {clean(i.message)}
          </li>
        ))}
        {shiftWide.map((i, n) => (
          <li key={`s${n}`}>
            <StatusBadge status={i.severity} /> Schicht: {i.message}
          </li>
        ))}
      </ul>

      <h3>Vertretungsvorschläge</h3>
      <p className="hint">
        Die App macht nur Vorschläge. Du als Planer entscheidest, wer vertritt.
      </p>
      <label className="field">
        Zu besetzende Rolle{' '}
        <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {LINE_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
              {gaps.includes(r) ? ' (Lücke)' : ''}
            </option>
          ))}
        </select>
      </label>
      {suggestions.length === 0 ? (
        <p>Keine verfügbaren, qualifizierten Personen gefunden.</p>
      ) : (
        <ol className="suggestions" aria-label="Sortierte Vertretungsvorschläge">
          {suggestions.slice(0, 8).map((s) => (
            <li key={s.person.id}>
              <div>
                <strong>{s.person.name}</strong> · {crewName(s.person.crewId)} ·{' '}
                <span className={`tier tier-${s.tier}`}>{TIER_LABEL[s.tier]}</span>
                {s.notes.length > 0 && (
                  <ul className="notes">
                    {s.notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                type="button"
                className="btn btn-primary"
                aria-label={`${s.person.name} als ${ROLE_LABELS[role]} auf ${lineName} übernehmen`}
                onClick={() =>
                  onAccept({
                    date: view.date,
                    shift: view.shift,
                    line,
                    role,
                    personId: s.person.id,
                  })
                }
              >
                Übernehmen
              </button>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
