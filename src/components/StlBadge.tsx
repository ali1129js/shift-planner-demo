import type { StlOnDuty } from '../domain';

/** Prominent STL (Shift Team Leader) badge next to the shift heading. */
export function StlBadge({ stl }: { stl: StlOnDuty | undefined }) {
  if (stl?.stl && stl.present) {
    return (
      <p className="stl stl-present" role="note" aria-label={`STL on duty: ${stl.stl.name}`}>
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
      aria-label={`Warning: No STL on duty${name ? `, ${name} is absent` : ''}`}
    >
      <span className="stl-label">
        <span aria-hidden="true">! </span>STL
      </span>
      <span className="stl-name">No STL on duty</span>
      {name && <span className="stl-absent-name">{name} (absent)</span>}
    </p>
  );
}
