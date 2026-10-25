import type { Status } from '../planner';

type BadgeStatus = Status | 'info';

const META: Record<BadgeStatus, { icon: string; label: string }> = {
  ok: { icon: '✓', label: 'OK' },
  warning: { icon: '!', label: 'Warnung' },
  error: { icon: '✕', label: 'Fehler' },
  info: { icon: 'i', label: 'Info' },
};

export function StatusBadge({
  status,
  detail,
}: {
  status: BadgeStatus;
  detail?: string | undefined;
}) {
  const m = META[status];
  const text = detail ? `${m.label}: ${detail}` : m.label;
  return (
    <span className={`badge badge-${status}`} role="img" aria-label={`Status ${text}`}>
      <span aria-hidden="true" className="badge-icon">
        {m.icon}
      </span>
      {text}
    </span>
  );
}
