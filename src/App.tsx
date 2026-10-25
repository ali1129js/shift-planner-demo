import { useMemo, useState } from 'react';
import { SidePanel } from './components/SidePanel';
import { WeekGrid } from './components/WeekGrid';
import { isoWeek, longDate } from './components/format';
import {
  COMPANY_NAME,
  CREWS,
  ROTATION_NOTE,
  SHIFTS,
  SHIFT_TYPES,
  addDays,
  generateDemoData,
  mondayOf,
  rotationForWeek,
  toIsoDate,
  weekdayIndex,
  type Assignment,
  type IsoDate,
  type LineId,
} from './domain';
import { buildWeek } from './planner';
import './App.css';

interface Props {
  /** Date used for "this week"; defaults to today. Handy for tests and screenshots. */
  today?: IsoDate;
}

const sameAssignment = (a: Assignment, b: Assignment) =>
  a.date === b.date &&
  a.shift === b.shift &&
  a.line === b.line &&
  a.role === b.role &&
  a.personId === b.personId;

export default function App({ today = toIsoDate(new Date()) }: Props) {
  // On weekends there is no work, so "this week" means the coming week.
  const thisWeek = weekdayIndex(today) >= 5 ? mondayOf(addDays(today, 7)) : mondayOf(today);
  const [weekStart, setWeekStart] = useState(thisWeek);
  const [data, setData] = useState(() => generateDemoData({ referenceDate: thisWeek }));
  const [accepted, setAccepted] = useState<Assignment[]>([]);
  const [selected, setSelected] = useState<{ date: IsoDate; shift: string; line: LineId } | null>(
    null,
  );

  const views = useMemo(
    () => buildWeek(weekStart, data.people, data.absences, accepted),
    [weekStart, data, accepted],
  );
  const peopleById = useMemo(() => new Map(data.people.map((p) => [p.id, p])), [data]);
  const selectedView =
    selected && views.find((v) => v.date === selected.date && v.shift === selected.shift);
  const rotation = rotationForWeek(weekStart);
  const crewName = (id: string) => CREWS.find((c) => c.id === id)?.name ?? id;

  const goTo = (w: IsoDate) => {
    setWeekStart(w);
    setSelected(null);
  };
  const reset = () => {
    setData(generateDemoData({ referenceDate: thisWeek }));
    setAccepted([]);
    setSelected(null);
    setWeekStart(thisWeek);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>Shift Planner Demo</h1>
          <p className="sub">{COMPANY_NAME} · fictional demo data</p>
        </div>
        <button type="button" className="btn" onClick={reset}>
          Load demo data / Reset
        </button>
      </header>

      <nav className="weeknav" aria-label="Week navigation">
        <button type="button" className="btn" onClick={() => goTo(addDays(weekStart, -7))}>
          ← Previous week
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => goTo(thisWeek)}
          disabled={weekStart === thisWeek}
        >
          This week
        </button>
        <button type="button" className="btn" onClick={() => goTo(addDays(weekStart, 7))}>
          Next week →
        </button>
        <h2 className="weeklabel" aria-live="polite">
          Week {isoWeek(weekStart)}: {longDate(weekStart)} – {longDate(addDays(weekStart, 4))}
        </h2>
      </nav>

      <p className="rotation">
        Rotation:{' '}
        {SHIFT_TYPES.map((s) => `${SHIFTS[s].label} = ${crewName(rotation[s])}`).join(' · ')}
        {accepted.length > 0 && ` · ${accepted.length} cover(s) added by planner (not saved yet)`}
      </p>

      <div className={`layout${selectedView ? ' with-panel' : ''}`}>
        <WeekGrid
          weekStart={weekStart}
          views={views}
          peopleById={peopleById}
          selected={selected}
          onSelect={(v, line) => setSelected({ date: v.date, shift: v.shift, line })}
        />
        {selected && selectedView && (
          <SidePanel
            key={`${selected.date}|${selected.shift}|${selected.line}`}
            view={selectedView}
            line={selected.line}
            people={data.people}
            absences={data.absences}
            accepted={accepted}
            onAccept={(a) =>
              setAccepted((prev) => (prev.some((x) => sameAssignment(x, a)) ? prev : [...prev, a]))
            }
            onRemove={(a) => setAccepted((prev) => prev.filter((x) => !sameAssignment(x, a)))}
            onClose={() => setSelected(null)}
          />
        )}
      </div>

      <footer className="foot">
        <p>
          <strong>Note:</strong> {ROTATION_NOTE}
        </p>
        <p>All people and the company are fictional. Changes are kept in memory only for now.</p>
      </footer>
    </div>
  );
}
