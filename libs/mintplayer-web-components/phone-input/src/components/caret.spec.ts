import { describe, expect, it } from 'vitest';
import { digitsBefore, digitsOf, indexAfterDigits, nearestDigitIndex } from './caret';

const SAMPLE = '470 12 34 56';

describe('caret arithmetic (D10 rule 1)', () => {
  it('counts digits before an index', () => {
    expect(digitsBefore(SAMPLE, 0)).toBe(0);
    expect(digitsBefore(SAMPLE, 4)).toBe(3); // after '470 '
    expect(digitsBefore(SAMPLE, SAMPLE.length)).toBe(9);
    expect(digitsBefore(SAMPLE, 99)).toBe(9);
  });

  it('finds the index after the n-th digit', () => {
    expect(indexAfterDigits(SAMPLE, 3)).toBe(3); // right after '470', before the space
    expect(indexAfterDigits(SAMPLE, 4)).toBe(5); // after '470 1'
    expect(indexAfterDigits(SAMPLE, 9)).toBe(SAMPLE.length);
    expect(indexAfterDigits(SAMPLE, 99)).toBe(SAMPLE.length);
  });

  it('n = 0 is index 0, BEFORE any leading separator', () => {
    expect(indexAfterDigits('(212) 555', 0)).toBe(0);
  });

  it('walks to the nearest digit through separators, both directions', () => {
    expect(nearestDigitIndex(SAMPLE, 4, -1)).toBe(2); // backspace after the space → the 0
    expect(nearestDigitIndex(SAMPLE, 3, 1)).toBe(4); // delete on the space → the 1
    expect(nearestDigitIndex('  12', 1, -1)).toBe(-1);
    expect(nearestDigitIndex(SAMPLE, SAMPLE.length, 1)).toBe(-1);
  });

  it('strips to digits', () => {
    expect(digitsOf('(+32) 470-12.34 56')).toBe('32470123456');
    expect(digitsOf('')).toBe('');
  });
});
