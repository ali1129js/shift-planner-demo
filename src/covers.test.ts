// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { COVERS_KEY, loadCovers, saveCovers } from './covers';
import type { Assignment } from './domain';
import { MONDAY, person } from './domain/testFixtures';

const people = [person('p1'), person('p2')];
const cover = (over: Partial<Assignment> = {}): Assignment => ({
  date: MONDAY,
  shift: 'early',
  line: '1',
  role: 'primary',
  personId: 'p1',
  ...over,
});
const store = (covers: unknown[], referenceDate = MONDAY, version = 1) =>
  localStorage.setItem(COVERS_KEY, JSON.stringify({ version, referenceDate, covers }));

describe('accepted covers persistence', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips through localStorage under the versioned key, assignment fields only', () => {
    const covers = [cover(), cover({ personId: 'p2', shift: 'night', line: '3' })];
    saveCovers(MONDAY, covers);
    expect(COVERS_KEY).toMatch(/\.v1$/);
    expect(loadCovers(MONDAY, people)).toEqual(covers);
    const raw = JSON.parse(localStorage.getItem(COVERS_KEY) ?? '{}');
    expect(Object.keys(raw.covers[0]).sort()).toEqual([
      'date',
      'line',
      'personId',
      'role',
      'shift',
    ]);
  });

  it('starts empty on missing data, bad JSON, wrong version or another week', () => {
    expect(loadCovers(MONDAY, people)).toEqual([]);
    localStorage.setItem(COVERS_KEY, '{nope');
    expect(loadCovers(MONDAY, people)).toEqual([]);
    store([cover()], MONDAY, 2);
    expect(loadCovers(MONDAY, people)).toEqual([]);
    store([cover()], '2026-11-02');
    expect(loadCovers(MONDAY, people)).toEqual([]);
    localStorage.setItem(COVERS_KEY, JSON.stringify({ version: 1, referenceDate: MONDAY }));
    expect(loadCovers(MONDAY, people)).toEqual([]);
  });

  it('drops corrupt rows, unknown people and duplicates but keeps the good rows', () => {
    store([
      cover(),
      cover(),
      cover({ personId: 'ghost' }),
      { ...cover(), line: '9' },
      { ...cover(), date: 'Montag' },
      'junk',
      null,
      cover({ personId: 'p2' }),
    ]);
    expect(loadCovers(MONDAY, people)).toEqual([cover(), cover({ personId: 'p2' })]);
  });

  it('starts empty when storage throws', () => {
    const storage = {
      getItem: () => {
        throw new Error('denied');
      },
    };
    expect(loadCovers(MONDAY, people, storage)).toEqual([]);
  });
});
