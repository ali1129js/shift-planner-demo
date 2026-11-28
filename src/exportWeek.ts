import { sameAssignment } from './covers';
import { isoWeek, isoWeekYear } from './components/format';
import {
  LINE_IDS,
  LINES,
  ROLE_LABELS,
  SHIFTS,
  type Assignment,
  type IsoDate,
  type LineId,
  type Person,
} from './domain';
import { CARD_ROLES, lineSlots, type ShiftView } from './planner';

export interface WeekExportRow {
  date: string;
  shift: string;
  line: string;
  role: string;
  person: string;
  status: string;
  cover: 'ja' | 'nein';
}

const HEADERS = ['Datum', 'Schicht', 'Linie', 'Rolle', 'Person', 'Status', 'Vertretung'] as const;

function defaultLineName(id: LineId): string {
  return LINES.find((l) => l.id === id)?.name ?? id;
}

function slotStatus(state: string, note?: string): string {
  if (state === 'missing') return 'offen';
  if (state === 'optional') return 'optional (2. Sekundär)';
  if (state === 'flagged') return note ?? 'Hinweis';
  return 'besetzt';
}

/** One row per slot of the visible Monday–Friday, plus a single Feiertag row per holiday date. */
export function buildWeekExportRows(
  views: readonly ShiftView[],
  peopleById: ReadonlyMap<string, Person>,
  accepted: readonly Assignment[],
  lineName: (id: LineId) => string = defaultLineName,
): WeekExportRow[] {
  const rows: WeekExportRow[] = [];
  const seenHoliday = new Set<IsoDate>();
  for (const view of views) {
    if (view.holiday) {
      if (!seenHoliday.has(view.date)) {
        seenHoliday.add(view.date);
        rows.push({
          date: view.date,
          shift: '',
          line: '',
          role: '',
          person: '',
          status: `Feiertag: ${view.holiday}`,
          cover: 'nein',
        });
      }
      continue;
    }
    for (const line of LINE_IDS) {
      const slots = lineSlots(view, line);
      for (const role of CARD_ROLES) {
        for (const slot of slots[role] ?? []) {
          const personId = slot.personId;
          const person = personId ? (peopleById.get(personId)?.name ?? personId) : '';
          const isCover =
            personId !== undefined &&
            accepted.some((a) =>
              sameAssignment(a, {
                date: view.date,
                shift: view.shift,
                line,
                role: slot.role,
                personId,
              }),
            );
          rows.push({
            date: view.date,
            shift: SHIFTS[view.shift].label,
            line: lineName(line),
            role: ROLE_LABELS[slot.role],
            person,
            status: slotStatus(slot.state, slot.note),
            cover: isCover ? 'ja' : 'nein',
          });
        }
      }
    }
  }
  return rows;
}

export function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

export function rowsToCsv(rows: readonly WeekExportRow[]): string {
  const lines = [
    HEADERS.join(','),
    ...rows.map((r) =>
      [r.date, r.shift, r.line, r.role, r.person, r.status, r.cover].map(csvCell).join(','),
    ),
  ];
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function weekToCsv(
  views: readonly ShiftView[],
  peopleById: ReadonlyMap<string, Person>,
  accepted: readonly Assignment[],
  lineName?: (id: LineId) => string,
): string {
  return rowsToCsv(buildWeekExportRows(views, peopleById, accepted, lineName));
}

export function weekExportFilename(weekStart: IsoDate): string {
  const week = String(isoWeek(weekStart)).padStart(2, '0');
  return `schichtplan-${isoWeekYear(weekStart)}-W${week}.csv`;
}

export function downloadTextFile(
  filename: string,
  contents: string,
  mime = 'text/csv;charset=utf-8',
): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
