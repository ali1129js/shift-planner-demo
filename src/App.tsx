import { useMemo } from 'react';
import {
  COMPANY_NAME,
  ROTATION_NOTE,
  SHIFTS,
  SHIFT_TYPES,
  addDays,
  checkShift,
  crewForShift,
  draftShiftAssignments,
  generateDemoData,
  isWorkingDay,
  toIsoDate,
  type IsoDate,
} from './domain';

function nextWorkingDay(from: IsoDate): IsoDate {
  let d = from;
  while (!isWorkingDay(d)) d = addDays(d, 1);
  return d;
}

export default function App() {
  const today = toIsoDate(new Date());
  const date = nextWorkingDay(today);
  const reports = useMemo(() => {
    const { people, absences } = generateDemoData({ referenceDate: date });
    return SHIFT_TYPES.map((shift) => {
      const assignments = draftShiftAssignments(date, shift, people, absences);
      return {
        shift,
        crew: crewForShift(shift, date),
        report: checkShift(date, shift, { people, absences, assignments }),
      };
    });
  }, [date]);

  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        maxWidth: 760,
        margin: '2rem auto',
        padding: '0 1rem',
      }}
    >
      <h1>Shift Planner Demo</h1>
      <p>
        {COMPANY_NAME} (fictional) - staffing status for {date}
        {date !== today ? ' (next working day)' : ''}. All data is generated demo data.
      </p>
      {reports.map(({ shift, crew, report }) => (
        <section key={shift}>
          <h2>
            {SHIFTS[shift].label} {SHIFTS[shift].start}-{SHIFTS[shift].end} - {crew}:{' '}
            {report.ok ? 'OK' : `${report.errors} error(s)`}, {report.warnings} warning(s)
          </h2>
          <ul>
            {report.issues
              .filter((i) => i.severity !== 'info')
              .map((i, n) => (
                <li key={n}>
                  [{i.severity}] {i.message}
                </li>
              ))}
          </ul>
        </section>
      ))}
      <p>
        <em>Note: {ROTATION_NOTE}</em>
      </p>
    </main>
  );
}
