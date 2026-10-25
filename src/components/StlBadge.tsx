import type { StlOnDuty } from '../domain';

/** Prominent STL (Shift Team Leader) badge next to the shift heading. */
export function StlBadge({ stl }: { stl: StlOnDuty | undefined }) {
  if (stl?.stl && stl.present) {
    return (
      <p className="stl stl-present" role="note" aria-label={`STL im Dienst: ${stl.stl.name}`}>
        <span className="stl-label">STL</span>
        <span className="stl-name">{stl.stl.name}</span>
      </p>
    );
  }
  const name = stl?.stl?.name;
  return (
    <p
      className="stl stl-absent"
      role="note"
      aria-label={`Warnung: Kein STL im Dienst${name ? `, ${name} ist abwesend` : ''}`}
    >
      <span className="stl-label">
        <span aria-hidden="true">! </span>STL
      </span>
      <span className="stl-name">Kein STL im Dienst</span>
      {name && <span className="stl-absent-name">{name} (abwesend)</span>}
    </p>
  );
}
