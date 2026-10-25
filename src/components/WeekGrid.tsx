import {
  CREWS,
  LINES,
  ROLE_LABELS,
  ROLES,
  SHIFTS,
  SHIFT_TYPES,
  type LineId,
  type Person,
} from '../domain';
import { lineIssues, statusOf, weekDates, type ShiftView } from '../planner';
import { StatusBadge } from './StatusBadge';
import { dayLabel } from './format';

interface Props {
  weekStart: string;
  views: ShiftView[];
  peopleById: Map<string, Person>;
  onSelect: (view: ShiftView, line: LineId) => void;
  selected: { date: string; shift: string; line: LineId } | null;
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const summary = (e: number, w: number) =>
  e + w === 0
    ? undefined
    : [e && plural(e, 'error'), w && plural(w, 'warning')].filter(Boolean).join(', ');

export function WeekGrid({ weekStart, views, peopleById, onSelect, selected }: Props) {
  const dates = weekDates(weekStart);
  const find = (date: string, shift: string) =>
    views.find((v) => v.date === date && v.shift === shift);

  return (
    <div className="grid" role="table" aria-label="Week plan">
      <div role="row" className="grid-row grid-head">
        <div role="columnheader" className="grid-corner">
          Shift
        </div>
        {dates.map((d) => (
          <div role="columnheader" key={d}>
            {dayLabel(d)}
          </div>
        ))}
      </div>
      {SHIFT_TYPES.map((shift) => (
        <div role="row" className="grid-row" key={shift}>
          <div role="rowheader" className="shift-head">
            <strong>{SHIFTS[shift].label}</strong>
            <span>
              {SHIFTS[shift].start}–{SHIFTS[shift].end}
            </span>
          </div>
          {dates.map((date) => {
            const view = find(date, shift);
            if (!view) return <div role="cell" key={date} />;
            const { errors, warnings } = view.report;
            const crew = CREWS.find((c) => c.id === view.crew)?.name ?? view.crew;
            return (
              <section
                role="cell"
                key={date}
                className="shift-cell"
                aria-label={`${SHIFTS[shift].label} shift, ${dayLabel(date)}`}
              >
                <header className="shift-cell-head">
                  <span className="crew">{crew}</span>
                  <StatusBadge
                    status={errors > 0 ? 'error' : warnings > 0 ? 'warning' : 'ok'}
                    detail={summary(errors, warnings)}
                  />
                </header>
                {LINES.map((line) => {
                  const issues = lineIssues(view, line.id);
                  const status = statusOf(issues);
                  const isSel =
                    selected?.date === date &&
                    selected.shift === shift &&
                    selected.line === line.id;
                  return (
                    <button
                      type="button"
                      key={line.id}
                      className={`line line-${status}${isSel ? ' line-selected' : ''}`}
                      aria-pressed={isSel}
                      aria-label={`${line.name}, ${SHIFTS[shift].label}, ${dayLabel(date)}: ${status === 'ok' ? 'OK' : status}. Open details`}
                      onClick={() => onSelect(view, line.id)}
                    >
                      <span className="line-head">
                        <span>{line.name}</span>
                        <StatusBadge status={status} />
                      </span>
                      <span className="line-people">
                        {ROLES.map((role) => {
                          const names = view.assignments
                            .filter((a) => a.line === line.id && a.role === role)
                            .map((a) => peopleById.get(a.personId)?.name ?? a.personId);
                          return (
                            <span key={role} className="role-row">
                              <span className="role">{ROLE_LABELS[role]}:</span>{' '}
                              {names.length ? names.join(', ') : <em>—</em>}
                            </span>
                          );
                        })}
                      </span>
                    </button>
                  );
                })}
              </section>
            );
          })}
        </div>
      ))}
    </div>
  );
}
