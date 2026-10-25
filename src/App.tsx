import { useCallback, useMemo, useState } from 'react';
import { LineCard } from './components/LineCard';
import { SettingsPanel } from './components/SettingsPanel';
import { SidePanel } from './components/SidePanel';
import { StatusBadge } from './components/StatusBadge';
import { StlBadge } from './components/StlBadge';
import { SHIFT_ICONS } from './components/shiftIcons';
import { WeekStrip } from './components/WeekStrip';
import { dayLabel, isoWeek, longDate } from './components/format';
import {
  COMPANY_NAME,
  CREWS,
  LINES,
  ROTATION_NOTE,
  SHIFTS,
  SHIFT_TYPES,
  addDays,
  generateDemoData,
  mondayOf,
  stlOnDuty,
  toIsoDate,
  weekdayIndex,
  type Assignment,
  type IsoDate,
  type LineId,
  type Role,
  type ShiftType,
} from './domain';
import { buildWeek, chipText, shiftLevelIssues, weekDates } from './planner';
import { useLineNames } from './settings';
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
  const isWeekend = weekdayIndex(today) >= 5;
  // On weekends there is no work, so "this week" means the coming week.
  const thisWeek = isWeekend ? mondayOf(addDays(today, 7)) : mondayOf(today);
  const [weekStart, setWeekStart] = useState(thisWeek);
  const [day, setDay] = useState(isWeekend ? 0 : weekdayIndex(today));
  const [shift, setShift] = useState<ShiftType>('early');
  const [data, setData] = useState(() => generateDemoData({ referenceDate: thisWeek }));
  const [accepted, setAccepted] = useState<Assignment[]>([]);
  const [panel, setPanel] = useState<{ line: LineId; role: Role } | null>(null);
  const { names, update, reset: resetNames } = useLineNames();

  const views = useMemo(
    () => buildWeek(weekStart, data.people, data.absences, accepted),
    [weekStart, data, accepted],
  );
  const peopleById = useMemo(() => new Map(data.people.map((p) => [p.id, p])), [data]);
  const dates = weekDates(weekStart);
  const date = dates[day] ?? weekStart;
  const view = views.find((v) => v.date === date && v.shift === shift);
  const lineName = (id: LineId) => names[id].trim() || (LINES.find((l) => l.id === id)?.name ?? id);
  const crewName = (id: string) => CREWS.find((c) => c.id === id)?.name ?? id;
  const totals = views.reduce(
    (t, v) => ({ e: t.e + v.report.errors, w: t.w + v.report.warnings }),
    { e: 0, w: 0 },
  );
  const stl = view ? stlOnDuty(view.date, view.shift, data.people, data.absences) : undefined;
  const closePanel = useCallback(() => setPanel(null), []);

  const goTo = (w: IsoDate) => {
    setWeekStart(w);
    setPanel(null);
  };
  const select = (d: IsoDate, s: ShiftType) => {
    setDay(Math.max(0, dates.indexOf(d)));
    setShift(s);
    setPanel(null);
  };
  const reset = () => {
    setData(generateDemoData({ referenceDate: thisWeek }));
    setAccepted([]);
    setPanel(null);
    setWeekStart(thisWeek);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>Schichtplaner Demo</h1>
          <p className="sub">{COMPANY_NAME} · fiktive Demodaten</p>
        </div>
        <div className="topbar-actions">
          <SettingsPanel names={names} onChange={update} onReset={resetNames} />
          <button type="button" className="btn" onClick={reset}>
            Demodaten laden / Zurücksetzen
          </button>
        </div>
      </header>

      <nav className="weeknav" aria-label="Wochennavigation">
        <button type="button" className="btn" onClick={() => goTo(addDays(weekStart, -7))}>
          ← Vorherige Woche
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => goTo(thisWeek)}
          disabled={weekStart === thisWeek}
        >
          Diese Woche
        </button>
        <button type="button" className="btn" onClick={() => goTo(addDays(weekStart, 7))}>
          Nächste Woche →
        </button>
        <h2 className="weeklabel" aria-live="polite">
          KW {isoWeek(weekStart)}: {longDate(weekStart)} – {longDate(addDays(weekStart, 4))}
        </h2>
      </nav>

      <p className="summary" aria-live="polite">
        <StatusBadge status={chipText(totals.e, totals.w).status} /> Diese Woche: {totals.e} Fehler,{' '}
        {totals.w} Warnungen
        {accepted.length > 0 &&
          ` · ${accepted.length} Vertretung(en) von dir hinzugefügt (noch nicht gespeichert)`}
      </p>

      <WeekStrip weekStart={weekStart} views={views} selected={{ date, shift }} onSelect={select} />

      <div className="tabs" role="group" aria-label="Tag">
        {dates.map((d, i) => (
          <button
            key={d}
            type="button"
            className="tab"
            aria-pressed={i === day}
            onClick={() => select(d, shift)}
          >
            {dayLabel(d)}
          </button>
        ))}
      </div>
      <div className="tabs" role="group" aria-label="Schicht">
        {SHIFT_TYPES.map((s) => (
          <button
            key={s}
            type="button"
            className={`tab tab-shift shift-${s}`}
            aria-pressed={s === shift}
            onClick={() => select(date, s)}
          >
            <span aria-hidden="true">{SHIFT_ICONS[s]}</span> {SHIFTS[s].label} {SHIFTS[s].start}–
            {SHIFTS[s].end}
          </button>
        ))}
      </div>

      {view && (
        <main className={`shift-area shift-${shift}`} data-shift={shift}>
          <div className="shift-heading">
            <h2 className="shift-title">
              <span aria-hidden="true">{SHIFT_ICONS[shift]}</span> {dayLabel(date)} ·{' '}
              {SHIFTS[shift].label} {SHIFTS[shift].start}–{SHIFTS[shift].end} ·{' '}
              {crewName(view.crew)} im Dienst
            </h2>
            <StlBadge stl={stl} />
          </div>
          {shiftLevelIssues(view).length > 0 && (
            <ul className="shift-issues">
              {shiftLevelIssues(view).map((i, n) => (
                <li key={n}>
                  <StatusBadge status={i.severity} /> {i.message}
                </li>
              ))}
            </ul>
          )}
          <div className="cards">
            {LINES.map((l) => (
              <LineCard
                key={l.id}
                view={view}
                line={l.id}
                name={lineName(l.id)}
                peopleById={peopleById}
                onOpen={(line, role) => setPanel({ line, role })}
              />
            ))}
          </div>
        </main>
      )}

      {panel && view && (
        <SidePanel
          key={`${view.date}|${view.shift}|${panel.line}|${panel.role}`}
          view={view}
          line={panel.line}
          lineName={lineName(panel.line)}
          initialRole={panel.role}
          people={data.people}
          absences={data.absences}
          accepted={accepted}
          onAccept={(a) =>
            setAccepted((prev) => (prev.some((x) => sameAssignment(x, a)) ? prev : [...prev, a]))
          }
          onRemove={(a) => setAccepted((prev) => prev.filter((x) => !sameAssignment(x, a)))}
          onClose={closePanel}
        />
      )}

      <footer className="foot">
        <p>
          <strong>Hinweis:</strong> {ROTATION_NOTE}
        </p>
        <p>
          Alle Personen und die Firma sind fiktiv. Änderungen werden vorerst nur im Speicher
          gehalten.
        </p>
      </footer>
    </div>
  );
}
