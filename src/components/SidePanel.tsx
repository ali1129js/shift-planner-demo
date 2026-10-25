import { useEffect, useRef, useState } from 'react';
import {
  CREWS,
  ROLES,
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
  'Same role, same crew',
  'Same role, other crew',
  'Stand-in',
  'Stand-in (last resort)',
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
  const clean = (m: string) => m.replace(/^Line \d+: /, '');

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
        <button type="button" className="btn" onClick={onClose} aria-label="Close details">
          Close
        </button>
      </div>
      <p>
        {crewName(view.crew)} on duty. <StatusBadge status={statusOf(issues)} />
      </p>

      <h3>Assigned</h3>
      <ul className="plain">
        {onLine.length === 0 && <li>Nobody assigned.</li>}
        {onLine.map((a) => (
          <li key={`${a.personId}-${a.role}`}>
            <strong>{ROLE_LABELS[a.role]}:</strong> {byId.get(a.personId)?.name ?? a.personId}
            {isAccepted(a) && (
              <>
                {' '}
                <span className="tag">added by planner</span>{' '}
                <button type="button" className="btn btn-small" onClick={() => onRemove(a)}>
                  Remove
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      <h3>Rule check</h3>
      <ul className="plain">
        {issues.length === 0 && <li>All rules met for this line.</li>}
        {issues.map((i, n) => (
          <li key={n}>
            <StatusBadge status={i.severity} /> {clean(i.message)}
          </li>
        ))}
        {shiftWide.map((i, n) => (
          <li key={`s${n}`}>
            <StatusBadge status={i.severity} /> Shift: {i.message}
          </li>
        ))}
      </ul>

      <h3>Cover suggestions</h3>
      <p className="hint">The app only suggests. You, the planner, decide who covers.</p>
      <label className="field">
        Role to cover{' '}
        <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
              {gaps.includes(r) ? ' (gap)' : ''}
            </option>
          ))}
        </select>
      </label>
      {suggestions.length === 0 ? (
        <p>No available, qualified people found.</p>
      ) : (
        <ol className="suggestions" aria-label="Ranked cover suggestions">
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
                aria-label={`Accept ${s.person.name} as ${ROLE_LABELS[role]} on ${lineName}`}
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
                Accept
              </button>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
