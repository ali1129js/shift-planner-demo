import { addDays, mondayOf } from './dates';
import { createRng } from './random';
import {
  ABSENCE_TYPES,
  CREW_IDS,
  LINE_IDS,
  type Absence,
  type LineId,
  type Person,
  type Role,
  type IsoDate,
} from './schemas';

// Invented names only. Any resemblance to real people is coincidental.
const FIRST = [
  'Alex',
  'Robin',
  'Sam',
  'Jordan',
  'Kim',
  'Toni',
  'Mika',
  'Charlie',
  'Luca',
  'Noa',
  'Jona',
  'Elia',
  'Rene',
  'Kai',
  'Lio',
  'Finn',
  'Mara',
  'Ida',
  'Tessa',
  'Nele',
  'Ronja',
  'Pia',
  'Lena',
  'Juna',
];
const LAST = [
  'Example',
  'Sample',
  'Testmann',
  'Muster',
  'Placeholder',
  'Demo',
  'Fictio',
  'Mockup',
  'Prototyp',
  'Draft',
  'Sketch',
  'Template',
  'Pattern',
  'Model',
  'Specimen',
];

/** Per crew: each line gets 1 Primary, 2 Secondaries, 1 Shift Lead, 1 Mechanic = 20 people, plus 2 spares. */
const SLOTS: readonly Role[] = ['primary', 'secondary', 'secondary', 'lead', 'mechanic'];

export interface DemoData {
  people: Person[];
  absences: Absence[];
}

export interface DemoOptions {
  seed?: number;
  /** Absences are spread over the 4 weeks starting at the Monday of this date. */
  referenceDate: IsoDate;
}

export function generateDemoData({ seed = 42, referenceDate }: DemoOptions): DemoData {
  const rng = createRng(seed);
  const people: Person[] = [];
  const usedNames = new Set<string>();
  const uniqueName = () => {
    for (;;) {
      const n = `${rng.pick(FIRST)} ${rng.pick(LAST)}`;
      if (!usedNames.has(n)) {
        usedNames.add(n);
        return n;
      }
    }
  };
  const otherLines = (home: LineId): LineId[] =>
    LINE_IDS.filter((l) => l !== home && rng.chance(0.3));

  for (const crewId of CREW_IDS) {
    for (const line of LINE_IDS) {
      for (const role of SLOTS) {
        const roles = new Set<Role>([role]);
        // Varied cross-training.
        if (role === 'secondary' && rng.chance(0.35)) roles.add('primary');
        if (role === 'primary' && rng.chance(0.8)) roles.add('secondary');
        if (role === 'lead') {
          roles.add('secondary');
          if (rng.chance(0.3)) roles.add('primary');
        }
        const lines =
          role === 'mechanic'
            ? rng.chance(0.6)
              ? [line, ...otherLines(line)]
              : [line]
            : [line, ...otherLines(line)];
        people.push({
          id: `p${String(people.length + 1).padStart(3, '0')}`,
          name: uniqueName(),
          crewId,
          homeRole: role,
          homeLine: line,
          roles: [...roles],
          lines,
        });
      }
    }
    // Two spares per crew: cross-trained operators who can cover several lines.
    for (let i = 0; i < 2; i++) {
      const homeLine = rng.pick(LINE_IDS);
      const roles: Role[] =
        i === 0 ? ['primary', 'secondary'] : ['secondary', 'primary', 'mechanic'];
      const lines = [homeLine, ...LINE_IDS.filter((l) => l !== homeLine && rng.chance(0.5))];
      people.push({
        id: `p${String(people.length + 1).padStart(3, '0')}`,
        name: uniqueName(),
        crewId,
        homeRole: roles[0] ?? 'secondary',
        homeLine,
        roles,
        lines,
        spare: true,
      });
    }
  }

  const start = mondayOf(referenceDate);
  const absences: Absence[] = [];
  for (const p of people) {
    if (!rng.chance(0.2)) continue;
    const type = rng.pick(ABSENCE_TYPES.filter((t) => t !== 'contract-end'));
    const from = addDays(start, rng.int(0, 25));
    const length = type === 'vacation' ? rng.int(4, 11) : rng.int(0, 3);
    absences.push({
      id: `a${absences.length + 1}`,
      personId: p.id,
      type,
      from,
      to: addDays(from, length),
    });
  }
  // One contract end to exercise that absence type.
  const leaver = rng.pick(people);
  absences.push({
    id: `a${absences.length + 1}`,
    personId: leaver.id,
    type: 'contract-end',
    from: addDays(start, 14),
    to: '9999-12-31',
  });

  return { people, absences };
}
