import { SHIFTS, SHIFT_TYPES, type IsoDate, type ShiftType } from '../domain';
import { chipText, weekDates, type ShiftView } from '../planner';
import { dayLabel } from './format';

interface Props {
  weekStart: IsoDate;
  views: ShiftView[];
  selected: { date: IsoDate; shift: ShiftType };
  onSelect: (date: IsoDate, shift: ShiftType) => void;
}

export function WeekStrip({ weekStart, views, selected, onSelect }: Props) {
  const dates = weekDates(weekStart);
  return (
    <div className="strip" role="group" aria-label="Week overview">
      <span />
      {dates.map((d) => (
        <span key={d} className="strip-day">
          {dayLabel(d)}
        </span>
      ))}
      {SHIFT_TYPES.map((shift) => (
        <div key={shift} className="strip-row">
          <span className="strip-shift">{SHIFTS[shift].label}</span>
          {dates.map((date) => {
            const v = views.find((x) => x.date === date && x.shift === shift);
            if (!v) return <span key={date} />;
            const c = chipText(v.report.errors, v.report.warnings);
            const isSel = selected.date === date && selected.shift === shift;
            return (
              <button
                key={date}
                type="button"
                className={`chip chip-${c.status}${isSel ? ' chip-selected' : ''}`}
                aria-pressed={isSel}
                aria-label={`${dayLabel(date)} ${SHIFTS[shift].label}: ${c.status === 'ok' ? 'OK' : c.status}, ${v.report.errors} errors, ${v.report.warnings} warnings`}
                onClick={() => onSelect(date, shift)}
              >
                <span aria-hidden="true">{c.icon}</span> {c.text}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
