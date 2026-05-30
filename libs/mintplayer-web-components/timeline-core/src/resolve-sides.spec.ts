import { describe, expect, it } from 'vitest';
import { resolveSides } from './resolve-sides';

describe('resolveSides', () => {
  it('puts every item on the start side for align=start', () => {
    expect(resolveSides(3, 'start', false)).toEqual(['start', 'start', 'start']);
  });

  it('puts every item on the end side for align=end', () => {
    expect(resolveSides(3, 'end', false)).toEqual(['end', 'end', 'end']);
  });

  it('zig-zags from start for align=alternate', () => {
    expect(resolveSides(4, 'alternate', false)).toEqual(['start', 'end', 'start', 'end']);
  });

  it('zig-zags from end for align=alternate-reverse', () => {
    expect(resolveSides(4, 'alternate-reverse', false)).toEqual(['end', 'start', 'end', 'start']);
  });

  it('reverse flips the alternate parity by visual index, keyed by source order', () => {
    // count=4, reverse: source 0 -> visual 3 (odd -> end), source 1 -> visual 2 (even -> start), ...
    expect(resolveSides(4, 'alternate', true)).toEqual(['end', 'start', 'end', 'start']);
  });

  it('reverse is a no-op for uniform alignment', () => {
    expect(resolveSides(3, 'start', true)).toEqual(['start', 'start', 'start']);
    expect(resolveSides(3, 'end', true)).toEqual(['end', 'end', 'end']);
  });

  it('handles empty / zero counts', () => {
    expect(resolveSides(0, 'alternate', false)).toEqual([]);
    expect(resolveSides(-2, 'alternate', false)).toEqual([]);
  });

  it('odd-length alternate keeps first and last on the start side', () => {
    const sides = resolveSides(5, 'alternate', false);
    expect(sides).toEqual(['start', 'end', 'start', 'end', 'start']);
    expect(sides[0]).toBe('start');
    expect(sides[sides.length - 1]).toBe('start');
  });
});
