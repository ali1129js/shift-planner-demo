import { useCallback, useMemo, useState } from 'react';
import { useAbsences } from './absences';
import { AbsenceEditor } from './components/AbsenceEditor';
import { ConfirmDialog } from './components/ConfirmDialog';
import { useCovers } from './covers';
import { PlantLocation } from './components/PlantLocation';
import { LineCard } from './components/LineCard';
import { SettingsPanel } from './components/SettingsPanel';
import { SidePanel } from './components/SidePanel';
import { StatusBadge } from './components/StatusBadge';
import { StlBadge } from './components/StlBadge';
import { SHIFT_ICONS } from './components/shiftIcons';
import { ThemeToggle } from './components/ThemeToggle';
import { WeekStrip } from './components/WeekStrip';
import { useMotion, useTheme } from './theme/theme';
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
  holidayMap,
  mondayOf,
  stateName,
  stlOnDuty,
  toIsoDate,
  weekdayIndex,
  type IsoDate,
  type LineId,
  type Role,
  type ShiftType,
} from './domain';
import { buildWeek, chipText, shiftLevelIssues, weekDates } from './planner';
import { useLineNames } from './settings';
import { usePlantState } from './location';
import './App.css';

interface Props {
  /** Date used for "this week"; defaults to today. Handy for tests and screenshots. */
  today?: IsoDate;
}

export default function App({ today = toIsoDate(new Date()) }: Props) {
  const [theme, chooseTheme] = useTheme();
  const [motion, toggleMotion, reducedMotion] = useMotion();
  const isWeekend = weekdayIndex(today) >= 5;
  // On weekends there is no work, so "this week" means the coming week.
  const thisWeek = isWeekend ? mondayOf(addDays(today, 7)) : mondayOf(today);
  const [weekStart, setWeekStart] = useState(thisWeek);
  const [day, setDay] = useState(isWeekend ? 0 : weekdayIndex(today));
  const [shift, setShift] = useState<ShiftType>('early');
  // People are deterministic demo data; absences and accepted covers are persisted per browser.
  const people = useMemo(() => generateDemoData({ referenceDate: thisWeek }).people, [thisWeek]);
  const generatedAbsences = useCallback(
    () => generateDemoData({ referenceDate: thisWeek }).absences,
    [thisWeek],
  );
  const {
    absences,
    set: setAbsences,
    reset: resetAbsences,
  } = useAbsences(thisWeek, generatedAbsences);
  const data = useMemo(() => ({ people, absences }), [people, absences]);
  const {
    covers: accepted,
    accept: acceptCover,
    remove: removeCover,
    reset: resetCovers,
  } = useCovers(thisWeek, people);
  const [panel, setPanel] = useState<{ line: LineId; role: Role } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const { names, update, reset: resetNames } = useLineNames();
  const [plantState, setPlantState] = usePlantState();

  const holidays = useMemo(
    () => holidayMap(plantState, weekStart, addDays(weekStart, 4)),
    [plantState, weekStart],
  );
  const views = useMemo(
    () => buildWeek(weekStart, data.people, data.absences, accepted, holidays),
    [weekStart, data, accepted, holidays],
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
  const stl =
    view && !view.holiday
      ? stlOnDuty(view.date, view.shift, data.people, data.absences)
      : undefined;
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
    resetAbsences();
    resetCovers();
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
          <ThemeToggle
            theme={theme}
            onTheme={chooseTheme}
            motion={motion}
            reducedMotion={reducedMotion}
            onMotion={toggleMotion}
          />
          <SettingsPanel names={names} onChange={update} onReset={resetNames} />
          <button type="button" className="btn" onClick={() => setConfirmReset(true)}>
            Demo zurücksetzen
          </button>
        </div>
      </header>
      {confirmReset ? (
        <ConfirmDialog
          title="Demo zurücksetzen?"
          message="Abwesenheiten werden auf die Demo-Daten zurückgesetzt, übernommene Vertretungen gehen verloren, und die Ansicht springt zu dieser Woche. Das lässt sich nicht rückgängig machen."
          confirmLabel="Zurücksetzen"
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            reset();
            setConfirmReset(false);
          }}
        />
      ) : null}

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

      <PlantLocation
        state={plantState}
        onChange={(st) => {
          setPlantState(st);
          setPanel(null);
        }}
      />

      <p className="summary" aria-live="polite">
        <StatusBadge status={chipText(totals.e, totals.w).status} /> Diese Woche: {totals.e} Fehler,{' '}
        {totals.w} Warnungen
        {accepted.length > 0 && ` · ${accepted.length} Vertretung(en) von dir hinzugefügt`}
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

      {view?.holiday && (
        <main className="shift-area shift-holiday" data-shift={shift}>
          <h2 className="shift-title">
            {dayLabel(date)} · Feiertag: {view.holiday}
          </h2>
          <p>
            Am Standort {stateName(plantState)} ist dieser Tag ein gesetzlicher Feiertag. Es läuft
            keine Schicht, es werden keine Einteilungen erzeugt und es gibt keine Besetzungsfehler.
          </p>
        </main>
      )}

      {view && !view.holiday && (
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

      <AbsenceEditor
        people={data.people}
        absences={data.absences}
        rangeFrom={weekStart}
        rangeTo={addDays(weekStart, 4)}
        onAdd={(a) => setAbsences([...data.absences, a])}
        onRemove={(id) => setAbsences(data.absences.filter((a) => a.id !== id))}
      />

      {panel && view && !view.holiday && (
        <SidePanel
          key={`${view.date}|${view.shift}|${panel.line}|${panel.role}`}
          view={view}
          line={panel.line}
          lineName={lineName(panel.line)}
          initialRole={panel.role}
          people={data.people}
          absences={data.absences}
          accepted={accepted}
          onAccept={acceptCover}
          onRemove={removeCover}
          onClose={closePanel}
        />
      )}

      <footer className="foot">
        <p>
          <strong>Hinweis:</strong> {ROTATION_NOTE}
        </p>
        <p>
          Alle Personen und die Firma sind fiktiv. Abwesenheiten, übernommene Vertretungen und
          Liniennamen werden nur in diesem Browser gespeichert.
        </p>
      </footer>
    </div>
  );
}
