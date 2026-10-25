import { ROLE_LABELS, type LineId, type Person, type Role } from '../domain';
import {
  CARD_ROLES,
  lineIssues,
  lineSlots,
  shortReason,
  statusOf,
  type ShiftView,
} from '../planner';
import { StatusBadge } from './StatusBadge';

interface Props {
  view: ShiftView;
  line: LineId;
  name: string;
  peopleById: Map<string, Person>;
  onOpen: (line: LineId, role: Role) => void;
}

const SEVERITY_DE = { ok: 'OK', warning: 'Warnung', error: 'Fehler' } as const;
const SLOT_ICON = { ok: '', warning: '!', error: '✕' } as const;

export function LineCard({ view, line, name, peopleById, onOpen }: Props) {
  const issues = lineIssues(view, line);
  const status = statusOf(issues);
  const slots = lineSlots(view, line);
  const reason = shortReason(issues);

  return (
    <section
      className={`card card-${status}`}
      aria-label={`${name}: ${status === 'ok' ? 'OK' : `${status === 'error' ? 'Fehler' : 'Warnung'}, ${reason}`}`}
    >
      <header className="card-head">
        <h3>{name}</h3>
        <StatusBadge status={status} detail={status === 'ok' ? undefined : reason} />
      </header>
      <dl className="roles">
        {CARD_ROLES.map((role) => (
          <div className="role-row" key={role}>
            <dt>{ROLE_LABELS[role]}</dt>
            <dd>
              {(slots[role] ?? []).map((slot, i) => {
                const person = slot.personId ? peopleById.get(slot.personId) : undefined;
                const label =
                  slot.state === 'missing'
                    ? '— fehlt'
                    : slot.state === 'optional'
                      ? '+ 2. optional'
                      : (person?.name ?? slot.personId ?? '');
                const icon = SLOT_ICON[slot.severity];
                const describe =
                  slot.state === 'filled'
                    ? `${ROLE_LABELS[role]}: ${label}. Vertretungsoptionen anzeigen`
                    : `${ROLE_LABELS[role]}: ${slot.state === 'missing' ? 'fehlt' : slot.state === 'optional' ? 'zweiter Sekundär optional' : `${label}, ${slot.note ?? ''}`} (${SEVERITY_DE[slot.severity]}). Vertretung finden`;
                return (
                  <button
                    key={`${slot.personId ?? slot.state}-${i}`}
                    type="button"
                    className={`slot slot-${slot.state} slot-${slot.severity}`}
                    aria-label={describe}
                    onClick={() => onOpen(line, role)}
                  >
                    {icon && <span aria-hidden="true">{icon} </span>}
                    {label}
                    {slot.state === 'flagged' && slot.note && <small> · {slot.note}</small>}
                  </button>
                );
              })}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
