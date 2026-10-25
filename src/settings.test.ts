import { describe, expect, it } from 'vitest';
import { LINE_NAMES_KEY, defaultLineNames, loadLineNames } from './settings';

const store = (v: string | null) => ({ getItem: (k: string) => (k === LINE_NAMES_KEY ? v : null) });

describe('line name settings', () => {
  it('defaults to Line 1-4', () => {
    expect(defaultLineNames()).toEqual({
      '1': 'Line 1',
      '2': 'Line 2',
      '3': 'Line 3',
      '4': 'Line 4',
    });
    expect(loadLineNames(store(null))).toEqual(defaultLineNames());
  });
  it('ignores corrupt or invalid stored values', () => {
    expect(loadLineNames(store('{not json'))).toEqual(defaultLineNames());
    expect(loadLineNames(store(JSON.stringify({ '1': 42 })))).toEqual(defaultLineNames());
  });
});
