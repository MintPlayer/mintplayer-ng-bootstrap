import { describe, expect, it } from 'vitest';

import { firstEnabledIndex, lastEnabledIndex, matchByLetter, nextEnabledIndex, rovingTarget } from './roving';

const disabled = (...indices: number[]) => (i: number) => indices.includes(i);

describe('nextEnabledIndex / first / last', () => {
  it('skips disabled items and clamps or wraps at the ends', () => {
    expect(nextEnabledIndex(4, 0, 1, false, disabled(1))).toBe(2);
    expect(nextEnabledIndex(3, 2, 1, false, disabled())).toBe(-1);
    expect(nextEnabledIndex(3, 2, 1, true, disabled(0))).toBe(1);
    expect(firstEnabledIndex(3, disabled(0))).toBe(1);
    expect(lastEnabledIndex(3, disabled(2))).toBe(1);
    expect(firstEnabledIndex(2, disabled(0, 1))).toBe(-1);
  });
});

describe('rovingTarget', () => {
  it('maps arrows by orientation and returns null for keys it does not own', () => {
    expect(rovingTarget('ArrowDown', { count: 3, from: 0 })).toBe(1);
    expect(rovingTarget('ArrowRight', { count: 3, from: 0 })).toBeNull();
    expect(rovingTarget('ArrowRight', { count: 3, from: 0, orientation: 'horizontal' })).toBe(1);
    expect(rovingTarget('a', { count: 3, from: 0 })).toBeNull();
  });

  it('mirrors Left/Right under rtl', () => {
    expect(rovingTarget('ArrowLeft', { count: 3, from: 0, orientation: 'horizontal', rtl: true })).toBe(1);
  });

  it('consumes an arrow at a clamped end without moving', () => {
    expect(rovingTarget('ArrowDown', { count: 3, from: 2 })).toBe(2);
    expect(rovingTarget('ArrowDown', { count: 3, from: 2, wrap: true })).toBe(0);
  });

  it('never claims browser and OS chords', () => {
    expect(rovingTarget('ArrowDown', { count: 3, from: 0 }, { altKey: true })).toBeNull();
    expect(rovingTarget('Home', { count: 3, from: 1 }, { ctrlKey: true })).toBeNull();
  });

  it('Home and End land on enabled items', () => {
    expect(rovingTarget('Home', { count: 4, from: 2, isDisabled: disabled(0) })).toBe(1);
    expect(rovingTarget('End', { count: 4, from: 0, isDisabled: disabled(3) })).toBe(2);
  });
});

describe('matchByLetter', () => {
  const labels = ['Apple', 'Banana', 'avocado', 'Éclair', 'Blueberry'];

  it('finds the next match after the current item, wrapping', () => {
    expect(matchByLetter(labels, 0, 'a')).toBe(2);
    expect(matchByLetter(labels, 2, 'A')).toBe(0);
    expect(matchByLetter(labels, 1, 'b')).toBe(4);
  });

  it('folds accents and skips disabled items', () => {
    expect(matchByLetter(labels, 0, 'e')).toBe(3);
    expect(matchByLetter(labels, 0, 'b', disabled(1))).toBe(4);
  });

  it('ignores non-printable or multi-character keys', () => {
    expect(matchByLetter(labels, 0, 'ArrowDown')).toBe(-1);
    expect(matchByLetter(labels, 0, ' ')).toBe(-1);
  });
});
